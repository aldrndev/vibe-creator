from typing import Literal

import cv2  # type: ignore

FocusProfile = Literal["auto", "subject-center", "object-center"]
TargetKind = Literal["face", "object"]


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def choose_crop_dimensions(
    source_width: int,
    source_height: int,
    target_width: int,
    target_height: int,
) -> tuple[int, int]:
    target_ratio = target_width / target_height
    source_ratio = source_width / source_height

    if source_ratio >= target_ratio:
        crop_height = source_height
        crop_width = int(round(crop_height * target_ratio))
    else:
        crop_width = source_width
        crop_height = int(round(crop_width / target_ratio))

    crop_width = max(2, min(crop_width, source_width))
    crop_height = max(2, min(crop_height, source_height))
    return crop_width, crop_height


def load_cascade(cascade_name: str) -> cv2.CascadeClassifier | None:
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + cascade_name)
    if cascade.empty():
        return None
    return cascade


def dedupe_faces(detections: list[tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
    unique: list[tuple[int, int, int, int]] = []
    for detection in detections:
        x, y, w, h = detection
        center_x = x + w / 2
        center_y = y + h / 2
        is_duplicate = False

        for existing in unique:
            ex, ey, ew, eh = existing
            existing_center_x = ex + ew / 2
            existing_center_y = ey + eh / 2
            center_distance = abs(center_x - existing_center_x) + abs(center_y - existing_center_y)
            size_distance = abs(w - ew) + abs(h - eh)
            if center_distance < max(w, ew) * 0.55 and size_distance < max(h, eh) * 0.45:
                is_duplicate = True
                break

        if not is_duplicate:
            unique.append(detection)

    return unique


def detect_faces(
    gray_frame,
    frontal_cascade: cv2.CascadeClassifier | None,
    profile_cascade: cv2.CascadeClassifier | None,
    min_face: int,
) -> list[tuple[int, int, int, int]]:
    detected: list[tuple[int, int, int, int]] = []

    if frontal_cascade is not None:
        frontal_faces = frontal_cascade.detectMultiScale(
            gray_frame,
            scaleFactor=1.08,
            minNeighbors=5,
            minSize=(min_face, min_face),
        )
        detected.extend(tuple(int(value) for value in face) for face in frontal_faces)

    if profile_cascade is not None:
        profile_faces = profile_cascade.detectMultiScale(
            gray_frame,
            scaleFactor=1.08,
            minNeighbors=4,
            minSize=(min_face, min_face),
        )
        detected.extend(tuple(int(value) for value in face) for face in profile_faces)

        mirrored = cv2.flip(gray_frame, 1)
        mirrored_faces = profile_cascade.detectMultiScale(
            mirrored,
            scaleFactor=1.08,
            minNeighbors=4,
            minSize=(min_face, min_face),
        )
        frame_width = gray_frame.shape[1]
        for face in mirrored_faces:
            x, y, w, h = [int(value) for value in face]
            detected.append((frame_width - x - w, y, w, h))

    return dedupe_faces(detected)


def score_face(
    face: tuple[int, int, int, int],
    current_center_x: float,
    current_center_y: float,
    source_width: int,
    source_height: int,
) -> float:
    face_x, face_y, face_w, face_h = face
    target_center_x = face_x + face_w / 2
    target_center_y = face_y + face_h * 0.42

    frame_center_x = source_width / 2
    frame_center_y = source_height / 2
    area_score = (face_w * face_h) / max(1, source_width * source_height)
    continuity_score = 1.0 - min(
        1.0,
        (
            abs(target_center_x - current_center_x) / max(1.0, source_width)
            + abs(target_center_y - current_center_y) / max(1.0, source_height)
        ),
    )
    center_bias = 1.0 - min(
        1.0,
        (
            abs(target_center_x - frame_center_x) / max(1.0, source_width)
            + abs(target_center_y - frame_center_y) / max(1.0, source_height)
        ),
    )

    return area_score * 8.5 + continuity_score * 3.8 + center_bias * 1.6


def choose_best_face(
    faces: list[tuple[int, int, int, int]],
    current_center_x: float,
    current_center_y: float,
    source_width: int,
    source_height: int,
) -> tuple[int, int, int, int] | None:
    if not faces:
        return None

    return max(
        faces,
        key=lambda face: score_face(
            face,
            current_center_x,
            current_center_y,
            source_width,
            source_height,
        ),
    )


def estimate_face_confidence(
    face: tuple[int, int, int, int] | None,
    current_center_x: float,
    current_center_y: float,
    source_width: int,
    source_height: int,
) -> float:
    if face is None:
        return 0.0

    raw_score = score_face(face, current_center_x, current_center_y, source_width, source_height)
    return clamp(raw_score / 5.6, 0.0, 1.0)


def score_object_box(
    box: tuple[int, int, int, int],
    current_center_x: float,
    current_center_y: float,
    source_width: int,
    source_height: int,
) -> float:
    x, y, w, h = box
    center_x = x + w / 2
    center_y = y + h / 2
    area_score = (w * h) / max(1, source_width * source_height)
    continuity_score = 1.0 - min(
        1.0,
        (
            abs(center_x - current_center_x) / max(1.0, source_width)
            + abs(center_y - current_center_y) / max(1.0, source_height)
        ),
    )
    center_bias = 1.0 - min(
        1.0,
        (
            abs(center_x - source_width / 2) / max(1.0, source_width)
            + abs(center_y - source_height / 2) / max(1.0, source_height)
        ),
    )

    return area_score * 8.0 + continuity_score * 3.2 + center_bias * 1.8


def detect_primary_object(
    gray_frame,
    previous_gray,
    current_center_x: float,
    current_center_y: float,
    source_width: int,
    source_height: int,
) -> tuple[tuple[int, int, int, int] | None, str]:
    edges = cv2.Canny(gray_frame, 55, 140)

    if previous_gray is not None:
        motion = cv2.absdiff(gray_frame, previous_gray)
        _, motion_mask = cv2.threshold(motion, 18, 255, cv2.THRESH_BINARY)
        edges = cv2.bitwise_or(edges, motion_mask)
        detector_used = "object-motion"
    else:
        detector_used = "object-edges"

    mask = cv2.dilate(edges, None, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, None, iterations=2)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None, detector_used

    frame_area = max(1, source_width * source_height)
    min_area = frame_area * 0.01
    max_area = frame_area * 0.72
    candidates: list[tuple[int, int, int, int]] = []

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < min_area or area > max_area:
            continue
        if h <= 0 or w <= 0:
            continue
        ratio = w / h
        if ratio < 0.18 or ratio > 5.5:
            continue
        candidates.append((int(x), int(y), int(w), int(h)))

    if not candidates:
        return None, detector_used

    best_box = max(
        candidates,
        key=lambda box: score_object_box(
            box, current_center_x, current_center_y, source_width, source_height
        ),
    )
    return best_box, detector_used


def estimate_object_confidence(
    box: tuple[int, int, int, int] | None,
    current_center_x: float,
    current_center_y: float,
    source_width: int,
    source_height: int,
) -> float:
    if box is None:
        return 0.0

    raw_score = score_object_box(box, current_center_x, current_center_y, source_width, source_height)
    return clamp(raw_score / 5.0, 0.0, 1.0)


def is_scene_cut(previous_gray, gray_frame) -> bool:
    if previous_gray is None:
        return False

    diff = cv2.absdiff(gray_frame, previous_gray)
    mean_diff = float(diff.mean()) / 255.0
    return mean_diff >= 0.36
