import json
import sys
from dataclasses import dataclass
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
    is_scene_cut,
)

TRACKING_TUNING_PRESETS = {
    "auto": {
        "min_tracking_confidence": 0.28,
        "shot_lock_seconds": 0.8,
        "min_switch_seconds": 0.26,
        "subject_face_anchor_ratio": 0.34,
        "subject_frame_anchor_ratio": 0.32,
        "auto_face_anchor_ratio": 0.38,
        "auto_frame_anchor_ratio": 0.36,
        "detection_stride": 2,
        "multi_face_hold_seconds": 0.84,
        "snap_on_new_lock": True,
        "snap_on_target_switch": True,
        "snap_on_scene_cut": True,
        "snap_min_confidence": 0.26,
        "deadzone_x_ratio": 0.12,
        "deadzone_y_ratio": 0.14,
        "temporal_alpha_fast": 0.66,
        "temporal_alpha_stable": 0.84,
        "max_pan_step_x_ratio": 0.028,
        "max_pan_step_y_ratio": 0.026,
        "micro_pan_deadzone_px": 1.2,
    },
    "subject-center": {
        "min_tracking_confidence": 0.28,
        "shot_lock_seconds": 0.8,
        "min_switch_seconds": 0.26,
        "subject_face_anchor_ratio": 0.34,
        "subject_frame_anchor_ratio": 0.32,
        "auto_face_anchor_ratio": 0.38,
        "auto_frame_anchor_ratio": 0.36,
        "detection_stride": 2,
        "multi_face_hold_seconds": 0.84,
        "snap_on_new_lock": True,
        "snap_on_target_switch": True,
        "snap_on_scene_cut": True,
        "snap_min_confidence": 0.26,
        "deadzone_x_ratio": 0.12,
        "deadzone_y_ratio": 0.14,
        "temporal_alpha_fast": 0.66,
        "temporal_alpha_stable": 0.84,
        "max_pan_step_x_ratio": 0.028,
        "max_pan_step_y_ratio": 0.026,
        "micro_pan_deadzone_px": 1.2,
    },
    "object-center": {
        "min_tracking_confidence": 0.28,
        "shot_lock_seconds": 0.8,
        "min_switch_seconds": 0.26,
        "subject_face_anchor_ratio": 0.34,
        "subject_frame_anchor_ratio": 0.32,
        "auto_face_anchor_ratio": 0.38,
        "auto_frame_anchor_ratio": 0.36,
        "detection_stride": 2,
        "multi_face_hold_seconds": 0.84,
        "snap_on_new_lock": True,
        "snap_on_target_switch": True,
        "snap_on_scene_cut": True,
        "snap_min_confidence": 0.26,
        "deadzone_x_ratio": 0.12,
        "deadzone_y_ratio": 0.14,
        "temporal_alpha_fast": 0.66,
        "temporal_alpha_stable": 0.84,
        "max_pan_step_x_ratio": 0.028,
        "max_pan_step_y_ratio": 0.026,
        "micro_pan_deadzone_px": 1.2,
    },
}

@dataclass
class TrackingState:
    current_x: float
    current_y: float
    filtered_x: float
    filtered_y: float
    lock_kind: TargetKind | None
    lock_frames: int
    frames_since_switch: int
    detections: int
    multi_faces: int
    max_faces: int


def _res_subj(best_face, face_conf, best_obj, obj_conf, face_count, min_conf, crop_h, tuning):
    if best_face is not None and face_conf >= min_conf:
        x, y, w, h = best_face
        tx = x + w / 2.0
        ty = y + h * tuning["subject_face_anchor_ratio"] + crop_h * (0.5 - tuning["subject_frame_anchor_ratio"])
        return "face", tx, ty
    if best_obj is not None and obj_conf >= (min_conf + 0.35) and face_count == 0:
        x, y, w, h = best_obj
        return "object", x + w / 2.0, y + h / 2.0
    return None, 0.0, 0.0


def _res_obj(best_face, face_conf, best_obj, obj_conf, min_conf, crop_h, tuning):
    if best_obj is not None and obj_conf >= min_conf:
        x, y, w, h = best_obj
        return "object", x + w / 2.0, y + h / 2.0
    if best_face is not None and face_conf >= (min_conf + 0.04):
        x, y, w, h = best_face
        tx = x + w / 2.0
        ty = y + h * tuning["auto_face_anchor_ratio"] + crop_h * (0.5 - tuning["auto_frame_anchor_ratio"])
        return "face", tx, ty
    return None, 0.0, 0.0


def _res_auto(best_face, face_conf, best_obj, obj_conf, face_count, min_conf, crop_h, tuning):
    if best_face is not None and best_obj is not None:
        if face_conf + 0.05 >= obj_conf:
            x, y, w, h = best_face
            tx = x + w / 2.0
            ty = y + h * tuning["auto_face_anchor_ratio"] + crop_h * (0.5 - tuning["auto_frame_anchor_ratio"])
            return "face", tx, ty
        x, y, w, h = best_obj
        return "object", x + w / 2.0, y + h / 2.0
    if best_face is not None and face_conf >= min_conf:
        x, y, w, h = best_face
        tx = x + w / 2.0
        ty = y + h * tuning["auto_face_anchor_ratio"] + crop_h * (0.5 - tuning["auto_frame_anchor_ratio"])
        return "face", tx, ty
    if best_obj is not None and obj_conf >= (min_conf + 0.35) and face_count == 0:
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
        kind, tx, ty = _res_subj(best_face, face_conf, best_obj, obj_conf, face_count, min_conf, crop_h, tuning)
    elif focus_profile == "object-center":
        kind, tx, ty = _res_obj(best_face, face_conf, best_obj, obj_conf, min_conf, crop_h, tuning)
    else:
        kind, tx, ty = _res_auto(best_face, face_conf, best_obj, obj_conf, face_count, min_conf, crop_h, tuning)
        
    return kind, (tx if kind else current_x), (ty if kind else current_y)


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
    dead_x = crop_width * tuning["deadzone_x_ratio"]
    dead_y = crop_height * tuning["deadzone_y_ratio"]

    if abs(dx) < dead_x and abs(dy) < dead_y:
        dx, dy = 0.0, 0.0

    movement = (abs(dx) / max(1.0, source_width)) + (abs(dy) / max(1.0, source_height))
    alpha = tuning["temporal_alpha_fast"] if movement > 0.08 else tuning["temporal_alpha_stable"]

    nxt_x = filtered_x + dx * (1.0 - alpha)
    nxt_y = filtered_y + dy * (1.0 - alpha)

    max_step_x = crop_width * tuning["max_pan_step_x_ratio"]
    max_step_y = crop_height * tuning["max_pan_step_y_ratio"]
    s_x = clamp(nxt_x - current_x, -max_step_x, max_step_x)
    s_y = clamp(nxt_y - current_y, -max_step_y, max_step_y)

    micro = tuning["micro_pan_deadzone_px"]
    if abs(s_x) < micro: s_x = 0.0
    if abs(s_y) < micro: s_y = 0.0

    return nxt_x, nxt_y, current_x + s_x, current_y + s_y

def _find_best_target(
    state: TrackingState, gray: Any, prev_gray: Any | None, 
    focus: str, tuning: dict, config: dict
) -> tuple[TargetKind | None, float, float]:
    faces = detect_faces(gray, config["fc_cascade"], config["pr_cascade"], config["min_face"])
    fc = len(faces)
    state.max_faces = max(state.max_faces, fc)
    if fc > 1: state.multi_faces += 1

    bf = choose_best_face(faces, state.current_x, state.current_y, config["sw"], config["sh"])
    bc = estimate_face_confidence(bf, state.current_x, state.current_y, config["sw"], config["sh"])

    bo, _ = detect_primary_object(gray, prev_gray, state.current_x, state.current_y, config["sw"], config["sh"])
    oc = estimate_object_confidence(bo, state.current_x, state.current_y, config["sw"], config["sh"])

    return _resolve_target(
        focus, bf, bc, bo, oc, fc, state.current_x, state.current_y, config["ch"], tuning
    )


def _check_target_switch(state: TrackingState, kind: TargetKind | None, min_sw: int) -> TargetKind | None:
    if kind is None or state.lock_kind is None or kind == state.lock_kind:
        return kind
    if state.lock_frames > 0 or state.frames_since_switch < min_sw:
        return None
    return kind

def _update_locks_and_position(
    state: TrackingState, kind: TargetKind | None, tx: float, ty: float, 
    scene_cut: bool, tuning: dict, config: dict
) -> None:
    min_sw = max(1, int(round(config["fps"] * tuning["min_switch_seconds"])))
    kind = _check_target_switch(state, kind, min_sw)

    if kind is None:
        if state.lock_frames > 0:
            state.lock_frames -= 1
        return

    shot_lock = max(8, int(round(config["fps"] * tuning["shot_lock_seconds"])))
    is_new = state.lock_kind is None
    is_sw = state.lock_kind is not None and kind != state.lock_kind
    
    state.lock_kind = kind
    state.lock_frames = shot_lock
    
    do_snap = bool(
        (is_new and tuning["snap_on_new_lock"])
        or (is_sw and tuning["snap_on_target_switch"])
        or (scene_cut and tuning["snap_on_scene_cut"])
    )
    
    if do_snap:
        state.filtered_x, state.filtered_y = tx, ty
        state.current_x, state.current_y = tx, ty
    else:
        state.filtered_x, state.filtered_y, state.current_x, state.current_y = _simulate_frame(
            tx, ty, state.filtered_x, state.filtered_y, state.current_x, state.current_y,
            tuning, config["cw"], config["ch"], config["sw"], config["sh"]
        )
        
    state.detections += 1
    if is_sw: 
        state.frames_since_switch = 0


def _apply_tracking(
    state: TrackingState, gray: Any, previous_gray: Any | None, scene_cut: bool, 
    should_detect: bool, focus_profile: str, tuning: dict, config: dict
) -> None:
    if not should_detect:
        if state.lock_frames > 0: state.lock_frames -= 1
        return

    kind, tx, ty = _find_best_target(state, gray, previous_gray, focus_profile, tuning, config)
    _update_locks_and_position(state, kind, tx, ty, scene_cut, tuning, config)


def _parse_args() -> tuple[str, str, int, int, str]:
    if len(sys.argv) not in (5, 6):
        print(json.dumps({"success": False, "error": "Usage: run_face_tracking.py <input> <output> <w> <h> [profile]"}))
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2]
    tw = int(sys.argv[3])
    th = int(sys.argv[4])
    prof = "auto"
    if len(sys.argv) == 6:
        prof = {"auto": "auto", "subject-center": "subject-center", "object-center": "object-center"}.get(sys.argv[5], "auto")
    
    return inp, out, tw, th, prof


def main() -> int:
    inp, out, tw, th, prof = _parse_args()

    cap = cv2.VideoCapture(inp)
    if not cap.isOpened():
        print(json.dumps({"success": False, "error": f"Unable to open input video: {inp}"}))
        return 1

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0: fps = 30.0

    sw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    sh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cw, ch = choose_crop_dimensions(sw, sh, tw, th)

    fc_cascade = load_cascade("haarcascade_frontalface_default.xml")
    pr_cascade = load_cascade("haarcascade_profileface.xml")
    if fc_cascade is None and pr_cascade is None:
        print(json.dumps({"success": False, "error": "Face cascade classifiers unavailable"}))
        return 1

    writer = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*"mp4v"), fps, (tw, th))
    if not writer.isOpened():
        print(json.dumps({"success": False, "error": f"Unable to open output video: {out}"}))
        return 1

    tuning = TRACKING_TUNING_PRESETS[prof]
    min_face = max(48, int(min(sw, sh) * 0.12))
    config = {
        "sw": sw, "sh": sh, "cw": cw, "ch": ch, "fps": fps,
        "fc_cascade": fc_cascade, "pr_cascade": pr_cascade, "min_face": min_face
    }
    
    state = TrackingState(
        current_x=sw / 2.0, current_y=sh / 2.0, filtered_x=sw / 2.0, filtered_y=sh / 2.0,
        lock_kind=None, lock_frames=0, frames_since_switch=max(1, int(round(fps * tuning["min_switch_seconds"]))),
        detections=0, multi_faces=0, max_faces=0
    )

    stride = max(1, int(tuning["detection_stride"]))
    frames = 0
    prev_gray = None

    while True:
        ok, frame = cap.read()
        if not ok: break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        cut = is_scene_cut(prev_gray, gray)
        if cut:
            state.lock_kind = None
            state.lock_frames = 0
            state.filtered_x = state.current_x
            state.filtered_y = state.current_y

        should_detect = cut or (frames % stride == 0) or state.lock_kind is None

        _apply_tracking(
            state, gray, prev_gray, cut, should_detect, prof, tuning, config
        )

        prev_gray = gray
        state.frames_since_switch += 1

        lx = int(round(clamp(state.current_x - cw / 2, 0, sw - cw)))
        ly = int(round(clamp(state.current_y - ch / 2, 0, sh - ch)))
        cropped = frame[ly:ly + ch, lx:lx + cw]
        resized = cv2.resize(cropped, (tw, th), interpolation=cv2.INTER_CUBIC)
        writer.write(resized)
        frames += 1

    cap.release()
    writer.release()

    print(json.dumps({
        "success": True, "frames": frames, "detections": state.detections,
        "multiFaceFrames": state.multi_faces, "maxFacesInFrame": state.max_faces,
        "detectorsUsed": ["frontal", "profile", "object-motion", "object-edges"],
    }))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
