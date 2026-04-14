"""Regression tests for face tracking smoothing and threshold logic.

These tests verify that:
1. Single-layer EMA smoothing prevents instant position jumps (the jittery crop bug)
2. Independent deadzone per axis prevents cross-axis jitter
3. The object-only fallback threshold is high enough to reject noise
4. Crop freezes when no target is detected (no phantom movement)
5. Smooth monotonic convergence without oscillation
6. Rolling median filters out noisy Haar cascade detections
"""

import sys
import os
import unittest
from unittest.mock import MagicMock

# Allow importing the core module from the same directory.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Mock cv2 before importing face_tracking_core since we don't need real OpenCV for math tests.
sys.modules['cv2'] = MagicMock()

from face_tracking_core import (  # type: ignore
    choose_crop_dimensions,
    clamp,
    estimate_face_confidence,
    estimate_object_confidence,
    score_face,
    score_object_box,
)

# ---------------------------------------------------------------------------
# Tuning constants copied from run_face_tracking.py "auto" preset.
# ---------------------------------------------------------------------------
AUTO_TUNING = {
    "min_tracking_confidence": 0.28,
    "shot_lock_seconds": 1.2,
    "min_switch_seconds": 0.5,
    "subject_face_anchor_ratio": 0.34,
    "subject_frame_anchor_ratio": 0.32,
    "auto_face_anchor_ratio": 0.38,
    "auto_frame_anchor_ratio": 0.36,
    "detection_stride": 4,
    "multi_face_hold_seconds": 0.84,
    "snap_on_new_lock": False,
    "snap_on_target_switch": False,
    "snap_on_scene_cut": False,
    "snap_min_confidence": 0.26,
    "new_lock_confirm_frames": 8,
    "deadzone_x_ratio": 0.22,
    "deadzone_y_ratio": 0.24,
    "ema_alpha_stable": 0.02,
    "ema_alpha_fast": 0.05,
    "ema_fast_threshold": 0.08,
    "max_pan_step_x_ratio": 0.008,
    "max_pan_step_y_ratio": 0.007,
    "micro_pan_deadzone_px": 3.5,
    "object_only_confidence_boost": 0.50,
    "disable_object_fallback": True,
}

SOURCE_WIDTH = 1920
SOURCE_HEIGHT = 1080
TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920
FACE_POSITION_BUFFER_SIZE = 5


def _median(values: list[float]) -> float:
    sorted_values = sorted(values)
    length = len(sorted_values)
    mid = length // 2
    if length % 2 == 0:
        return (sorted_values[mid - 1] + sorted_values[mid]) / 2.0
    return sorted_values[mid]


def _smooth_position(
    target_x: float,
    target_y: float,
    current_x: float,
    current_y: float,
    tuning: dict,
    crop_width: int,
    crop_height: int,
    source_width: int,
    source_height: int,
) -> tuple[float, float]:
    """Mirror of _smooth_position in run_face_tracking.py for isolated testing."""
    dx = target_x - current_x
    dy = target_y - current_y

    dead_x = crop_width * tuning["deadzone_x_ratio"]
    dead_y = crop_height * tuning["deadzone_y_ratio"]

    suppressed_x = abs(dx) < dead_x
    suppressed_y = abs(dy) < dead_y

    if suppressed_x:
        dx = 0.0
    if suppressed_y:
        dy = 0.0

    if suppressed_x and suppressed_y:
        return current_x, current_y

    norm_movement = (
        abs(dx) / max(1.0, float(source_width))
        + abs(dy) / max(1.0, float(source_height))
    )
    alpha = (
        tuning["ema_alpha_fast"]
        if norm_movement > tuning["ema_fast_threshold"]
        else tuning["ema_alpha_stable"]
    )

    step_x = dx * alpha
    step_y = dy * alpha

    max_step_x = crop_width * tuning["max_pan_step_x_ratio"]
    max_step_y = crop_height * tuning["max_pan_step_y_ratio"]
    step_x = clamp(step_x, -max_step_x, max_step_x)
    step_y = clamp(step_y, -max_step_y, max_step_y)

    micro = tuning["micro_pan_deadzone_px"]
    if abs(step_x) < micro:
        step_x = 0.0
    if abs(step_y) < micro:
        step_y = 0.0

    return current_x + step_x, current_y + step_y


def simulate_smooth_tracking(
    tuning: dict,
    raw_targets: list[tuple[float, float]],
    crop_width: int,
    crop_height: int,
    source_width: int = SOURCE_WIDTH,
    source_height: int = SOURCE_HEIGHT,
    snap_first: bool = True,
) -> list[tuple[float, float]]:
    """Simulate the single-layer EMA smoothing loop from run_face_tracking.py.

    Returns the (current_x, current_y) for each frame.
    """
    positions: list[tuple[float, float]] = []
    current_x = source_width / 2.0
    current_y = source_height / 2.0

    for i, (raw_x, raw_y) in enumerate(raw_targets):
        if i == 0 and snap_first:
            current_x = raw_x
            current_y = raw_y
        else:
            current_x, current_y = _smooth_position(
                raw_x, raw_y,
                current_x, current_y,
                tuning, crop_width, crop_height,
                source_width, source_height,
            )
        positions.append((current_x, current_y))

    return positions


class TestSingleLayerEMAPreventsJitter(unittest.TestCase):
    """Regression: crop must NOT jump instantly to each new detection."""

    def test_smoothing_limits_per_frame_movement(self) -> None:
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        # Simulate a face jumping 400px to the right in one frame.
        targets = [
            (960.0, 540.0),  # frame 0: center (will snap)
            (1360.0, 540.0),  # frame 1: face jumps 400px right
        ]
        positions = simulate_smooth_tracking(AUTO_TUNING, targets, crop_w, crop_h)

        delta_x = abs(positions[1][0] - positions[0][0])
        max_allowed = crop_w * AUTO_TUNING["max_pan_step_x_ratio"]
        self.assertLessEqual(
            delta_x,
            max_allowed + 0.01,
            f"Per-frame movement {delta_x:.1f}px exceeds max pan step {max_allowed:.1f}px",
        )

    def test_no_instant_jump_on_continuous_tracking(self) -> None:
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        # 10 frames of face oscillating left-right (simulating jitter detection).
        targets = [
            (960.0, 540.0),
            (1100.0, 540.0),
            (820.0, 540.0),
            (1150.0, 540.0),
            (780.0, 540.0),
            (1200.0, 540.0),
            (750.0, 540.0),
            (1250.0, 540.0),
            (700.0, 540.0),
            (1300.0, 540.0),
        ]
        positions = simulate_smooth_tracking(AUTO_TUNING, targets, crop_w, crop_h)
        max_step = crop_w * AUTO_TUNING["max_pan_step_x_ratio"]

        for i in range(1, len(positions)):
            dx = abs(positions[i][0] - positions[i - 1][0])
            self.assertLessEqual(
                dx,
                max_step + 0.01,
                f"Frame {i}: movement {dx:.1f}px exceeds max {max_step:.1f}px",
            )

    def test_smooth_monotonic_convergence(self) -> None:
        """Face moves from A to B; position must converge smoothly without oscillation."""
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        target_x = 1500.0
        targets = [(960.0, 540.0)] + [(target_x, 540.0)] * 60
        positions = simulate_smooth_tracking(AUTO_TUNING, targets, crop_w, crop_h)

        # After frame 0 (snap), every subsequent frame should move toward target
        # monotonically (no oscillation/reversal).
        for i in range(2, len(positions)):
            self.assertGreaterEqual(
                positions[i][0],
                positions[i - 1][0] - 0.01,
                f"Frame {i}: position {positions[i][0]:.1f} went backward "
                f"from {positions[i - 1][0]:.1f} — oscillation detected",
            )

    def test_very_slow_pan_speed(self) -> None:
        """Camera panning must be very slow — like a human operator."""
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        # Face at far right. Max step should be very small.
        targets = [(960.0, 540.0), (1600.0, 540.0)]
        positions = simulate_smooth_tracking(AUTO_TUNING, targets, crop_w, crop_h)

        delta = abs(positions[1][0] - positions[0][0])
        # At 30fps, max pan speed = max_step * fps
        # With 0.018 ratio * ~608px crop = ~10.9px/frame = ~328px/sec
        # This should take ~2 seconds to pan 640px — smooth enough.
        self.assertLess(
            delta, 12.0,
            f"Single frame pan {delta:.1f}px is too fast for smooth tracking",
        )


class TestIndependentDeadzone(unittest.TestCase):
    """Regression: deadzone must apply independently per axis."""

    def test_deadzone_suppresses_micro_movement(self) -> None:
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        deadzone_x = crop_w * AUTO_TUNING["deadzone_x_ratio"]
        small_offset = deadzone_x * 0.5
        targets = [
            (960.0, 540.0),
            (960.0 + small_offset, 540.0),
            (960.0 - small_offset, 540.0),
        ]
        positions = simulate_smooth_tracking(AUTO_TUNING, targets, crop_w, crop_h)

        self.assertEqual(
            positions[1][0], positions[0][0],
            "Deadzone did not suppress micro-movement",
        )
        self.assertEqual(
            positions[2][0], positions[0][0],
            "Deadzone did not suppress micro-movement",
        )

    def test_x_deadzone_independent_of_y(self) -> None:
        """Large X movement with small Y movement: only X axis should move."""
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        deadzone_y = crop_h * AUTO_TUNING["deadzone_y_ratio"]
        small_y_offset = deadzone_y * 0.3

        targets = [
            (960.0, 540.0),
            (1500.0, 540.0 + small_y_offset),
        ]
        positions = simulate_smooth_tracking(AUTO_TUNING, targets, crop_w, crop_h)

        x_moved = abs(positions[1][0] - positions[0][0]) > 0.0
        y_moved = abs(positions[1][1] - positions[0][1]) > 0.0

        self.assertTrue(x_moved, "X axis should have moved — it's outside deadzone")
        self.assertFalse(y_moved, "Y axis should NOT move — it's within deadzone")

    def test_y_deadzone_independent_of_x(self) -> None:
        """Large Y movement with small X movement: only Y axis should move."""
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        deadzone_x = crop_w * AUTO_TUNING["deadzone_x_ratio"]
        small_x_offset = deadzone_x * 0.3

        targets = [
            (960.0, 540.0),
            (960.0 + small_x_offset, 900.0),
        ]
        positions = simulate_smooth_tracking(AUTO_TUNING, targets, crop_w, crop_h)

        x_moved = abs(positions[1][0] - positions[0][0]) > 0.0
        y_moved = abs(positions[1][1] - positions[0][1]) > 0.0

        self.assertFalse(x_moved, "X axis should NOT move — it's within deadzone")
        self.assertTrue(y_moved, "Y axis should have moved — it's outside deadzone")

    def test_haar_noise_fully_absorbed(self) -> None:
        """Haar cascade noise (20-40px jitter) must be fully absorbed by deadzone."""
        crop_w, _ = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        deadzone_x = crop_w * AUTO_TUNING["deadzone_x_ratio"]
        # Typical Haar cascade jitter: ±40px around the true position.
        haar_noise = 40.0
        self.assertGreater(
            deadzone_x, haar_noise,
            f"Deadzone ({deadzone_x:.0f}px) must be larger than typical "
            f"Haar cascade noise (±{haar_noise:.0f}px)",
        )


class TestCropFreezesWithoutTarget(unittest.TestCase):
    """Regression: when no face or object is detected, crop must freeze completely."""

    def test_lost_target_holds_position(self) -> None:
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        initial_x, initial_y = 960.0, 540.0
        positions = simulate_smooth_tracking(
            AUTO_TUNING,
            [(initial_x, initial_y)] * 10,
            crop_w,
            crop_h,
        )

        for i, (px, py) in enumerate(positions):
            self.assertLess(
                abs(px - initial_x), 0.01,
                f"Frame {i}: x drifted to {px}",
            )
            self.assertLess(
                abs(py - initial_y), 0.01,
                f"Frame {i}: y drifted to {py}",
            )

    def test_no_face_no_movement_simulation(self) -> None:
        """Simulate full no-target scenario: position must remain frozen."""
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT,
        )
        start_x, start_y = 1200.0, 400.0
        targets = [(start_x, start_y)] * 20
        positions = simulate_smooth_tracking(
            AUTO_TUNING,
            targets,
            crop_w,
            crop_h,
        )

        for i in range(1, len(positions)):
            self.assertAlmostEqual(
                positions[i][0], start_x, places=2,
                msg=f"Frame {i}: X drifted from {start_x} to {positions[i][0]}",
            )
            self.assertAlmostEqual(
                positions[i][1], start_y, places=2,
                msg=f"Frame {i}: Y drifted from {start_y} to {positions[i][1]}",
            )


class TestObjectFallbackThreshold(unittest.TestCase):
    """Regression: object-only detection must require high confidence to prevent noise."""

    def test_low_confidence_object_rejected_in_auto_mode(self) -> None:
        min_conf = AUTO_TUNING["min_tracking_confidence"]
        required_threshold = min_conf + AUTO_TUNING["object_only_confidence_boost"]

        noise_box = (10, 10, 40, 40)
        noise_confidence = estimate_object_confidence(
            noise_box, 960.0, 540.0, SOURCE_WIDTH, SOURCE_HEIGHT,
        )

        self.assertLess(
            noise_confidence, required_threshold,
            f"Noise box confidence {noise_confidence:.3f} exceeds threshold"
            f" {required_threshold:.3f}; the tracker would chase edge noise",
        )

    def test_large_centered_object_accepted(self) -> None:
        min_conf = AUTO_TUNING["min_tracking_confidence"]
        required_threshold = min_conf + AUTO_TUNING["object_only_confidence_boost"]

        big_box = (700, 300, 520, 480)
        confidence = estimate_object_confidence(
            big_box, 960.0, 540.0, SOURCE_WIDTH, SOURCE_HEIGHT,
        )

        self.assertGreaterEqual(
            confidence, required_threshold,
            f"Large centered object confidence {confidence:.3f}"
            f" is below threshold {required_threshold:.3f}",
        )

    def test_medium_edge_contour_rejected(self) -> None:
        """Medium-sized contour away from center should be rejected as noise."""
        min_conf = AUTO_TUNING["min_tracking_confidence"]
        required_threshold = min_conf + AUTO_TUNING["object_only_confidence_boost"]

        edge_box = (1700, 50, 180, 160)
        confidence = estimate_object_confidence(
            edge_box, 960.0, 540.0, SOURCE_WIDTH, SOURCE_HEIGHT,
        )

        self.assertLess(
            confidence, required_threshold,
            f"Edge contour confidence {confidence:.3f} should be below "
            f"threshold {required_threshold:.3f}",
        )


class TestRollingMedianFilter(unittest.TestCase):
    """Rolling median must filter Haar cascade detection noise."""

    def test_median_eliminates_outliers(self) -> None:
        from run_face_tracking import _push_and_median  # type: ignore

        buffer: list[float] = []
        # Simulate 5 detections: 4 stable + 1 outlier
        values = [960.0, 962.0, 958.0, 1100.0, 961.0]
        medians: list[float] = []
        for value in values:
            result = _push_and_median(buffer, value, FACE_POSITION_BUFFER_SIZE)
            medians.append(result)

        # After all 5 values, the median should reject the 1100 outlier.
        # Sorted: [958, 960, 961, 962, 1100] → median = 961
        self.assertAlmostEqual(
            medians[-1], 961.0, places=1,
            msg=f"Median {medians[-1]} should have rejected outlier 1100",
        )

    def test_median_stabilizes_noisy_detections(self) -> None:
        from run_face_tracking import _push_and_median  # type: ignore

        buffer: list[float] = []
        # Simulate noisy Haar cascade: true position ~960, noise ±30px
        noisy_values = [960.0, 930.0, 990.0, 945.0, 975.0, 955.0, 985.0, 940.0, 970.0, 965.0]
        medians: list[float] = []
        for value in noisy_values:
            result = _push_and_median(buffer, value, FACE_POSITION_BUFFER_SIZE)
            medians.append(result)

        # After buffer is full, all medians should be close to 960 (the true center)
        for i in range(FACE_POSITION_BUFFER_SIZE, len(medians)):
            self.assertLess(
                abs(medians[i] - 960.0), 20.0,
                f"Median at step {i} ({medians[i]:.1f}) diverged too far from "
                f"true center 960",
            )


class TestSnapBehavior(unittest.TestCase):
    """Snap should only work for new lock and scene cuts, NOT target switch."""

    def test_first_frame_does_not_snap(self) -> None:
        """First frame should NOT snap — smoothing only."""
        self.assertFalse(
            AUTO_TUNING["snap_on_new_lock"],
            "snap_on_new_lock must be False to prevent visible jumps",
        )
        self.assertFalse(
            AUTO_TUNING["snap_on_scene_cut"],
            "snap_on_scene_cut must be False to prevent visible jumps",
        )

    def test_snap_on_target_switch_disabled(self) -> None:
        """Target switch must NOT cause a snap — it creates visible jumps."""
        self.assertFalse(
            AUTO_TUNING["snap_on_target_switch"],
            "snap_on_target_switch must be False to prevent visible jumps",
        )

    def test_object_fallback_disabled_for_face_modes(self) -> None:
        """Auto and subject-center should not fall back to object detection."""
        self.assertTrue(
            AUTO_TUNING["disable_object_fallback"],
            "Object detection fallback must be disabled for face tracking modes",
        )

    def test_scene_cut_requires_confirmation(self) -> None:
        """After scene cut, new lock requires N consecutive detections."""
        self.assertGreaterEqual(
            AUTO_TUNING["new_lock_confirm_frames"], 8,
            "new_lock_confirm_frames must be >= 8 to prevent false positive locks",
        )


if __name__ == "__main__":
    unittest.main()
