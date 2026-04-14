import json
import sys
from dataclasses import dataclass, field
from typing import Any

import cv2  # type: ignore

from face_tracking_core import (  # type: ignore
    FocusProfile,
    TargetKind,
    clamp,
    choose_crop_dimensions,
    load_cascade,
    detect_faces,
    choose_best_face,
    estimate_face_confidence,
    detect_primary_object,
    estimate_object_confidence,
)


def _log(msg: str) -> None:
    """Write diagnostic line to stderr (captured by Node.js runner)."""
    sys.stderr.write(f"[face-track] {msg}\n")
    sys.stderr.flush()

# --------------------------------------------------------------------------
# Rolling median buffer size for raw face positions.
# Haar cascades return noisy bounding boxes — the center can jitter by
# 20-40px between frames even for a stationary face. By keeping the last
# N detections and using the median, we eliminate this detection noise
# *before* it reaches the deadzone/EMA logic.
# --------------------------------------------------------------------------
FACE_POSITION_BUFFER_SIZE = 5

TRACKING_TUNING_PRESETS = {
    "auto": {
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
    },
    "subject-center": {
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
    },
    "object-center": {
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
        "disable_object_fallback": False,
    },
}

@dataclass
class TrackingState:
    current_x: float
    current_y: float
    lock_kind: TargetKind | None
    lock_frames: int
    frames_since_switch: int
    no_target_frames: int
    lock_confirm_remaining: int
    detections: int
    multi_faces: int
    max_faces: int
    face_x_buffer: list[float] = field(default_factory=list)
    face_y_buffer: list[float] = field(default_factory=list)


def _median(values: list[float]) -> float:
    """Return the median of a list of floats."""
    sorted_values = sorted(values)
    length = len(sorted_values)
    mid = length // 2
    if length % 2 == 0:
        return (sorted_values[mid - 1] + sorted_values[mid]) / 2.0
    return sorted_values[mid]


def _push_and_median(
    buffer: list[float], value: float, max_size: int,
) -> float:
    """Append value to rolling buffer, trim to max_size, return median."""
    buffer.append(value)
    if len(buffer) > max_size:
        del buffer[: len(buffer) - max_size]
    return _median(buffer)


def _res_subj(
    best_face: tuple[int, int, int, int] | None,
    face_conf: float,
    best_obj: tuple[int, int, int, int] | None,
    obj_conf: float,
    face_count: int,
    min_conf: float,
    crop_h: int,
    tuning: dict,
) -> tuple[str | None, float, float]:
    if best_face is not None and face_conf >= min_conf:
        x, y, w, h = best_face
        tx = x + w / 2.0
        ty = (
            y
            + h * tuning["subject_face_anchor_ratio"]
            + crop_h * (0.5 - tuning["subject_frame_anchor_ratio"])
        )
        return "face", tx, ty
    if tuning.get("disable_object_fallback", False):
        return None, 0.0, 0.0
    obj_threshold = min_conf + tuning["object_only_confidence_boost"]
    if best_obj is not None and obj_conf >= obj_threshold and face_count == 0:
        x, y, w, h = best_obj
        return "object", x + w / 2.0, y + h / 2.0
    return None, 0.0, 0.0


def _res_obj(
    best_face: tuple[int, int, int, int] | None,
    face_conf: float,
    best_obj: tuple[int, int, int, int] | None,
    obj_conf: float,
    min_conf: float,
    crop_h: int,
    tuning: dict,
) -> tuple[str | None, float, float]:
    if best_obj is not None and obj_conf >= min_conf:
        x, y, w, h = best_obj
        return "object", x + w / 2.0, y + h / 2.0
    if best_face is not None and face_conf >= (min_conf + 0.04):
        x, y, w, h = best_face
        tx = x + w / 2.0
        ty = (
            y
            + h * tuning["auto_face_anchor_ratio"]
            + crop_h * (0.5 - tuning["auto_frame_anchor_ratio"])
        )
        return "face", tx, ty
    return None, 0.0, 0.0


def _res_auto(
    best_face: tuple[int, int, int, int] | None,
    face_conf: float,
    best_obj: tuple[int, int, int, int] | None,
    obj_conf: float,
    face_count: int,
    min_conf: float,
    crop_h: int,
    tuning: dict,
) -> tuple[str | None, float, float]:
    if best_face is not None and face_conf >= min_conf:
        x, y, w, h = best_face
        tx = x + w / 2.0
        ty = (
            y
            + h * tuning["auto_face_anchor_ratio"]
            + crop_h * (0.5 - tuning["auto_frame_anchor_ratio"])
        )
        return "face", tx, ty
    if tuning.get("disable_object_fallback", False):
        return None, 0.0, 0.0
    obj_threshold = min_conf + tuning["object_only_confidence_boost"]
    if best_obj is not None and obj_conf >= obj_threshold and face_count == 0:
        x, y, w, h = best_obj
        return "object", x + w / 2.0, y + h / 2.0
    return None, 0.0, 0.0


def _resolve_target(
    focus_profile: str,
    best_face: tuple[int, int, int, int] | None,
    face_conf: float,
    best_obj: tuple[int, int, int, int] | None,
    obj_conf: float,
    face_count: int,
    current_x: float,
    current_y: float,
    crop_h: int,
    tuning: dict,
) -> tuple[TargetKind | None, float, float]:
    min_conf = tuning["min_tracking_confidence"]

    if focus_profile == "subject-center":
        kind, tx, ty = _res_subj(
            best_face, face_conf, best_obj, obj_conf,
            face_count, min_conf, crop_h, tuning,
        )
    elif focus_profile == "object-center":
        kind, tx, ty = _res_obj(
            best_face, face_conf, best_obj, obj_conf,
            min_conf, crop_h, tuning,
        )
    else:
        kind, tx, ty = _res_auto(
            best_face, face_conf, best_obj, obj_conf,
            face_count, min_conf, crop_h, tuning,
        )

    return kind, (tx if kind else current_x), (ty if kind else current_y)


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
    """Single-layer EMA smoothing with independent deadzone per axis.

    Directly smooths current_x/y toward the target using a very low alpha
    so the camera pans like a slow, deliberate camera operator.
    """
    dx = target_x - current_x
    dy = target_y - current_y

    # Independent deadzone per axis
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

    # Choose alpha based on movement magnitude
    norm_movement = (
        abs(dx) / max(1.0, float(source_width))
        + abs(dy) / max(1.0, float(source_height))
    )
    alpha = (
        tuning["ema_alpha_fast"]
        if norm_movement > tuning["ema_fast_threshold"]
        else tuning["ema_alpha_stable"]
    )

    # Single-layer EMA: move a small fraction toward the target
    step_x = dx * alpha
    step_y = dy * alpha

    # Safety clamp
    max_step_x = crop_width * tuning["max_pan_step_x_ratio"]
    max_step_y = crop_height * tuning["max_pan_step_y_ratio"]
    step_x = clamp(step_x, -max_step_x, max_step_x)
    step_y = clamp(step_y, -max_step_y, max_step_y)

    # Zoom-aware micro-pan deadzone.
    # At low resolutions the crop is tiny, so 1 source pixel becomes
    # many output pixels after scaling.  We compute how many output
    # pixels a source-pixel step would produce and suppress steps
    # that would cause a visible jump (> N output pixels).
    target_w = max(1, tuning.get("_target_w", crop_width))
    zoom = target_w / max(1.0, float(crop_width))
    micro_src = tuning["micro_pan_deadzone_px"]
    # Suppress if the step would produce < 2 output-pixels of movement
    effective_micro = max(micro_src, 2.0 / zoom) if zoom > 0 else micro_src
    if abs(step_x) < effective_micro:
        step_x = 0.0
    if abs(step_y) < effective_micro:
        step_y = 0.0

    return current_x + step_x, current_y + step_y


def _find_best_target(
    state: TrackingState, gray: Any, prev_gray: Any | None,
    focus: str, tuning: dict, config: dict,
) -> tuple[TargetKind | None, float, float]:
    faces = detect_faces(
        gray, config["fc_cascade"], config["pr_cascade"], config["min_face"],
    )
    fc = len(faces)
    state.max_faces = max(state.max_faces, fc)
    if fc > 1:
        state.multi_faces += 1

    bf = choose_best_face(
        faces, state.current_x, state.current_y, config["sw"], config["sh"],
    )
    bc = estimate_face_confidence(
        bf, state.current_x, state.current_y, config["sw"], config["sh"],
    )

    # Skip expensive object detection when object fallback is disabled
    bo = None
    oc = 0.0
    if not tuning.get("disable_object_fallback", False):
        bo, _ = detect_primary_object(
            gray, prev_gray,
            state.current_x, state.current_y, config["sw"], config["sh"],
        )
        oc = estimate_object_confidence(
            bo, state.current_x, state.current_y, config["sw"], config["sh"],
        )

    kind, tx, ty = _resolve_target(
        focus, bf, bc, bo, oc, fc,
        state.current_x, state.current_y, config["ch"], tuning,
    )

    # Apply rolling median to smooth Haar cascade detection noise
    if kind == "face" and bf is not None:
        tx = _push_and_median(state.face_x_buffer, tx, FACE_POSITION_BUFFER_SIZE)
        ty = _push_and_median(state.face_y_buffer, ty, FACE_POSITION_BUFFER_SIZE)
    elif kind is None:
        # Clear buffer when face is lost so stale data doesn't
        # influence the next detection
        state.face_x_buffer.clear()
        state.face_y_buffer.clear()

    return kind, tx, ty


def _check_target_switch(
    state: TrackingState, kind: TargetKind | None, min_sw: int,
) -> TargetKind | None:
    if kind is None or state.lock_kind is None or kind == state.lock_kind:
        return kind
    if state.lock_frames > 0 or state.frames_since_switch < min_sw:
        return None
    return kind


def _update_locks_and_position(
    state: TrackingState, kind: TargetKind | None, tx: float, ty: float,
    tuning: dict, config: dict,
) -> None:
    min_sw = max(1, int(round(config["fps"] * tuning["min_switch_seconds"])))
    kind = _check_target_switch(state, kind, min_sw)

    if kind is None:
        # No valid target — freeze position completely
        state.no_target_frames += 1
        if state.lock_frames > 0:
            state.lock_frames -= 1
        return

    # Valid target found — reset no-target counter
    state.no_target_frames = 0
    is_new = state.lock_kind is None

    # After scene cut (lock_kind is None), require multiple consecutive
    # detections before establishing a new lock. This prevents Haar
    # cascade false positives (trees, foliage, etc.) from causing jumps.
    if is_new and state.lock_confirm_remaining > 0:
        state.lock_confirm_remaining -= 1
        return

    shot_lock = max(8, int(round(config["fps"] * tuning["shot_lock_seconds"])))
    is_sw = state.lock_kind is not None and kind != state.lock_kind

    state.lock_kind = kind
    state.lock_frames = shot_lock

    # NEVER snap — always smooth-transition to prevent visible jumps.
    # Even after scene cuts, the crop position drifts slowly toward
    # the new face, creating a smooth camera-operator feel.
    state.current_x, state.current_y = _smooth_position(
        tx, ty, state.current_x, state.current_y,
        tuning, config["cw"], config["ch"], config["sw"], config["sh"],
    )

    state.detections += 1
    if is_sw:
        state.frames_since_switch = 0


def _apply_tracking(
    state: TrackingState, gray: Any, previous_gray: Any | None,
    should_detect: bool,
    focus_profile: str, tuning: dict, config: dict,
) -> None:
    if not should_detect:
        if state.lock_frames > 0:
            state.lock_frames -= 1
        return

    kind, tx, ty = _find_best_target(
        state, gray, previous_gray, focus_profile, tuning, config,
    )
    _update_locks_and_position(state, kind, tx, ty, tuning, config)


def _parse_args() -> tuple[str, str, int, int, str]:
    if len(sys.argv) not in (5, 6):
        print(json.dumps({
            "success": False,
            "error": "Usage: run_face_tracking.py <input> <output> <w> <h> [profile]",
        }))
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2]
    tw = int(sys.argv[3])
    th = int(sys.argv[4])
    prof = "auto"
    if len(sys.argv) == 6:
        profile_map = {
            "auto": "auto",
            "subject-center": "subject-center",
            "object-center": "object-center",
        }
        prof = profile_map.get(sys.argv[5], "auto")

    return inp, out, tw, th, prof


def main() -> int:
    inp, out, tw, th, prof = _parse_args()

    cap = cv2.VideoCapture(inp)
    if not cap.isOpened():
        print(json.dumps({
            "success": False,
            "error": f"Unable to open input video: {inp}",
        }))
        return 1

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0

    sw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    sh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cw, ch = choose_crop_dimensions(sw, sh, tw, th)

    fc_cascade = load_cascade("haarcascade_frontalface_default.xml")
    pr_cascade = load_cascade("haarcascade_profileface.xml")
    if fc_cascade is None and pr_cascade is None:
        print(json.dumps({
            "success": False,
            "error": "Face cascade classifiers unavailable",
        }))
        return 1

    writer = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*"mp4v"), fps, (tw, th))
    if not writer.isOpened():
        print(json.dumps({
            "success": False,
            "error": f"Unable to open output video: {out}",
        }))
        return 1

    tuning = {**TRACKING_TUNING_PRESETS[prof], "_target_w": tw}
    min_face = max(48, int(min(sw, sh) * 0.12))
    config = {
        "sw": sw, "sh": sh, "cw": cw, "ch": ch, "fps": fps,
        "fc_cascade": fc_cascade, "pr_cascade": pr_cascade, "min_face": min_face,
    }

    min_switch_frames = max(
        1, int(round(fps * tuning["min_switch_seconds"])),
    )
    confirm_needed = tuning.get("new_lock_confirm_frames", 0)
    state = TrackingState(
        current_x=sw / 2.0,
        current_y=sh / 2.0,
        lock_kind=None,
        lock_frames=0,
        frames_since_switch=min_switch_frames,
        no_target_frames=0,
        lock_confirm_remaining=confirm_needed,
        detections=0,
        multi_faces=0,
        max_faces=0,
    )

    stride = max(1, int(tuning["detection_stride"]))
    frames = 0
    prev_gray = None

    _log(f"start src={sw}x{sh} crop={cw}x{ch} target={tw}x{th} profile={prof}")
    _log(f"tuning alpha_s={tuning['ema_alpha_stable']} alpha_f={tuning['ema_alpha_fast']} "
         f"dz_x={tuning['deadzone_x_ratio']} dz_y={tuning['deadzone_y_ratio']} "
         f"max_step_x={tuning['max_pan_step_x_ratio']} confirm={tuning['new_lock_confirm_frames']}")

    prev_lx = -1
    prev_ly = -1

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Only run face detection on stride intervals — never every frame.
        should_detect = frames % stride == 0

        _apply_tracking(
            state, gray, prev_gray, should_detect, prof, tuning, config,
        )

        prev_gray = gray
        state.frames_since_switch += 1

        lx = int(round(clamp(state.current_x - cw / 2, 0, sw - cw)))
        ly = int(round(clamp(state.current_y - ch / 2, 0, sh - ch)))

        # Log every time the crop position actually changes
        if lx != prev_lx or ly != prev_ly:
            _log(f"f={frames} crop_moved lx={lx} ly={ly} "
                 f"cur=({state.current_x:.1f},{state.current_y:.1f}) "
                 f"lock={state.lock_kind} confirm={state.lock_confirm_remaining}")
            prev_lx = lx
            prev_ly = ly

        cropped = frame[ly:ly + ch, lx:lx + cw]
        resized = cv2.resize(cropped, (tw, th), interpolation=cv2.INTER_CUBIC)
        writer.write(resized)
        frames += 1

    cap.release()
    writer.release()

    print(json.dumps({
        "success": True,
        "frames": frames,
        "detections": state.detections,
        "multiFaceFrames": state.multi_faces,
        "maxFacesInFrame": state.max_faces,
        "detectorsUsed": ["frontal", "profile", "object-motion", "object-edges"],
    }))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
