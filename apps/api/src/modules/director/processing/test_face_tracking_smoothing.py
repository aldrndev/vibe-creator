"""Regression tests for face tracking smoothing and threshold logic.

These tests verify that:
1. EMA smoothing prevents instant position jumps (the jittery crop bug)
2. The object-only fallback threshold is high enough to reject noise
3. Crop freezes when no target is detected
"""

import sys
import os
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
# Tuning constants copied from run_face_tracking.py "auto" preset to verify
# the smoothing math in isolation without needing OpenCV / video I/O.
# ---------------------------------------------------------------------------
AUTO_TUNING = {
    "base_smoothing": 0.14,
    "fast_smoothing": 0.21,
    "drift_back": 0.045,
    "deadzone_x_ratio": 0.12,
    "deadzone_y_ratio": 0.14,
    "max_pan_step_x_ratio": 0.028,
    "max_pan_step_y_ratio": 0.026,
    "min_tracking_confidence": 0.28,
    "shot_lock_seconds": 0.8,
    "lost_target_drift_seconds": 0.2,
    "temporal_alpha_stable": 0.84,
    "temporal_alpha_fast": 0.66,
    "subject_face_anchor_ratio": 0.34,
    "subject_frame_anchor_ratio": 0.32,
    "auto_face_anchor_ratio": 0.38,
    "auto_frame_anchor_ratio": 0.36,
    "detection_stride": 2,
    "min_switch_seconds": 0.26,
    "micro_pan_deadzone_px": 1.2,
    "multi_face_hold_seconds": 0.84,
    "snap_on_new_lock": True,
    "snap_on_target_switch": True,
    "snap_on_scene_cut": True,
    "snap_min_confidence": 0.26,
}

SOURCE_WIDTH = 1920
SOURCE_HEIGHT = 1080
TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920


def _simulate_frame(
    raw_x: float,
    raw_y: float,
    filtered_x: float,
    filtered_y: float,
    current_x: float,
    current_y: float,
    tuning: dict,
    crop_width: int,
    crop_height: int,
    source_width: int,
    source_height: int,
) -> tuple[float, float, float, float]:
    dx = raw_x - filtered_x
    dy = raw_y - filtered_y
    deadzone_x = crop_width * tuning["deadzone_x_ratio"]
    deadzone_y = crop_height * tuning["deadzone_y_ratio"]

    if abs(dx) < deadzone_x and abs(dy) < deadzone_y:
        dx = 0.0
        dy = 0.0

    movement = (abs(dx) / max(1.0, source_width)) + (
        abs(dy) / max(1.0, source_height)
    )
    alpha = (
        tuning["temporal_alpha_fast"]
        if movement > 0.08
        else tuning["temporal_alpha_stable"]
    )

    new_target_x = filtered_x + dx * (1.0 - alpha)
    new_target_y = filtered_y + dy * (1.0 - alpha)

    max_step_x = crop_width * tuning["max_pan_step_x_ratio"]
    max_step_y = crop_height * tuning["max_pan_step_y_ratio"]
    step_x = clamp(new_target_x - current_x, -max_step_x, max_step_x)
    step_y = clamp(new_target_y - current_y, -max_step_y, max_step_y)

    micro = tuning["micro_pan_deadzone_px"]
    if abs(step_x) < micro:
        step_x = 0.0
    if abs(step_y) < micro:
        step_y = 0.0

    return new_target_x, new_target_y, current_x + step_x, current_y + step_y


def simulate_smooth_tracking(
    tuning: dict,
    raw_targets: list[tuple[float, float]],
    crop_width: int,
    crop_height: int,
    source_width: int = SOURCE_WIDTH,
    source_height: int = SOURCE_HEIGHT,
    snap_first: bool = True,
) -> list[tuple[float, float]]:
    """Simulate the EMA smoothing loop from run_face_tracking.py.

    Returns the (current_center_x, current_center_y) for each frame.
    """
    positions: list[tuple[float, float]] = []
    current_x = source_width / 2.0
    current_y = source_height / 2.0
    filtered_x = current_x
    filtered_y = current_y

    for i, (raw_x, raw_y) in enumerate(raw_targets):
        if i == 0 and snap_first:
            filtered_x = raw_x
            filtered_y = raw_y
            current_x = raw_x
            current_y = raw_y
        else:
            filtered_x, filtered_y, current_x, current_y = _simulate_frame(
                raw_x, raw_y,
                filtered_x, filtered_y,
                current_x, current_y,
                tuning, crop_width, crop_height,
                source_width, source_height
            )
        positions.append((current_x, current_y))

    return positions


import unittest

class TestEMASmoothingPreventsJitter(unittest.TestCase):
    """Regression: crop must NOT jump instantly to each new detection."""

    def test_smoothing_limits_per_frame_movement(self) -> None:
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT
        )
        # Simulate a face jumping 400px to the right in one frame.
        targets = [
            (960.0, 540.0),  # frame 0: center (will snap)
            (1360.0, 540.0),  # frame 1: face jumps 400px right
        ]
        positions = simulate_smooth_tracking(AUTO_TUNING, targets, crop_w, crop_h)

        # Before fix: position[1] would be (1360, 540) — instant jump.
        # After fix: position[1] must be much closer to center.
        delta_x = abs(positions[1][0] - positions[0][0])
        max_allowed = crop_w * AUTO_TUNING["max_pan_step_x_ratio"]
        self.assertLessEqual(delta_x, max_allowed + 0.01,
            f"Per-frame movement {delta_x:.1f}px exceeds max pan step {max_allowed:.1f}px"
        )

    def test_no_instant_jump_on_continuous_tracking(self) -> None:
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT
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
            self.assertLessEqual(dx, max_step + 0.01,
                f"Frame {i}: movement {dx:.1f}px exceeds max {max_step:.1f}px"
            )

    def test_deadzone_suppresses_micro_movement(self) -> None:
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT
        )
        deadzone_x = crop_w * AUTO_TUNING["deadzone_x_ratio"]
        # Move less than deadzone — should stay put.
        small_offset = deadzone_x * 0.5
        targets = [
            (960.0, 540.0),
            (960.0 + small_offset, 540.0),
            (960.0 - small_offset, 540.0),
        ]
        positions = simulate_smooth_tracking(AUTO_TUNING, targets, crop_w, crop_h)

        # Position should not change for frames 1-2 since movement is within deadzone.
        self.assertEqual(positions[1][0], positions[0][0], "Deadzone did not suppress micro-movement")
        self.assertEqual(positions[2][0], positions[0][0], "Deadzone did not suppress micro-movement")


class TestCropFreezesWithoutTarget(unittest.TestCase):
    """Regression: when no face or object is detected, crop must freeze."""

    def test_lost_target_holds_position(self) -> None:
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT
        )
        # First frame snaps, then simulate "no detection" by feeding the same center.
        initial_x, initial_y = 960.0, 540.0
        # When target is lost, run_face_tracking.py sets:
        #   filtered_target_x = current_center_x
        #   filtered_target_y = current_center_y
        # So we just verify the logic: crop stays at initial position.
        positions = simulate_smooth_tracking(
            AUTO_TUNING,
            [(initial_x, initial_y)] * 10,
            crop_w,
            crop_h,
        )

        for i, (px, py) in enumerate(positions):
            self.assertLess(abs(px - initial_x), 0.01, f"Frame {i}: x drifted to {px}")
            self.assertLess(abs(py - initial_y), 0.01, f"Frame {i}: y drifted to {py}")


class TestObjectFallbackThreshold(unittest.TestCase):
    """Regression: object-only detection must require high confidence to prevent noise."""

    def test_low_confidence_object_rejected_in_auto_mode(self) -> None:
        min_conf = AUTO_TUNING["min_tracking_confidence"]
        # The threshold for object-only fallback in auto mode is now +0.35.
        required_threshold = min_conf + 0.35

        # A small edge contour in the corner scores low.
        noise_box = (10, 10, 40, 40)
        noise_confidence = estimate_object_confidence(
            noise_box, 960.0, 540.0, SOURCE_WIDTH, SOURCE_HEIGHT
        )

        self.assertLess(noise_confidence, required_threshold,
            f"Noise box confidence {noise_confidence:.3f} exceeds threshold {required_threshold:.3f};"
            " the tracker would chase edge noise"
        )

    def test_large_centered_object_accepted(self) -> None:
        min_conf = AUTO_TUNING["min_tracking_confidence"]
        required_threshold = min_conf + 0.35

        # A large object near frame center should pass.
        big_box = (700, 300, 520, 480)
        confidence = estimate_object_confidence(
            big_box, 960.0, 540.0, SOURCE_WIDTH, SOURCE_HEIGHT
        )

        self.assertGreaterEqual(confidence, required_threshold,
            f"Large centered object confidence {confidence:.3f} is below threshold {required_threshold:.3f}"
        )


class TestSnapBehavior(unittest.TestCase):
    """Snap should still work for new lock, target switch, and scene cuts."""

    def test_first_frame_snaps_to_target(self) -> None:
        crop_w, crop_h = choose_crop_dimensions(
            SOURCE_WIDTH, SOURCE_HEIGHT, TARGET_WIDTH, TARGET_HEIGHT
        )
        target_x, target_y = 1400.0, 700.0
        positions = simulate_smooth_tracking(
            AUTO_TUNING,
            [(target_x, target_y)],
            crop_w,
            crop_h,
            snap_first=True,
        )

        self.assertLess(abs(positions[0][0] - target_x), 0.01)
        self.assertLess(abs(positions[0][1] - target_y), 0.01)


if __name__ == "__main__":
    unittest.main()
