import json
import sys

import cv2


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


def main() -> int:
    if len(sys.argv) != 5:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "Usage: run_face_tracking.py <input> <output> <target_w> <target_h>",
                }
            )
        )
        return 1

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    target_width = int(sys.argv[3])
    target_height = int(sys.argv[4])

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(
            json.dumps(
                {
                    "success": False,
                    "error": f"Unable to open input video: {input_path}",
                }
            )
        )
        return 1

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0

    source_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    source_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    crop_width, crop_height = choose_crop_dimensions(
        source_width,
        source_height,
        target_width,
        target_height,
    )

    frontal_cascade = load_cascade("haarcascade_frontalface_default.xml")
    profile_cascade = load_cascade("haarcascade_profileface.xml")
    if frontal_cascade is None and profile_cascade is None:
        print(json.dumps({"success": False, "error": "Face cascade classifiers unavailable"}))
        return 1

    writer = cv2.VideoWriter(
        output_path,
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (target_width, target_height),
    )
    if not writer.isOpened():
        print(
            json.dumps(
                {
                    "success": False,
                    "error": f"Unable to open output video: {output_path}",
                }
            )
        )
        return 1

    current_center_x = source_width / 2
    current_center_y = source_height / 2
    steady_smoothing = 0.14
    fast_smoothing = 0.24
    drift_back = 0.04
    detection_count = 0
    frame_count = 0
    multi_face_frames = 0
    max_faces_in_frame = 0
    min_face = max(48, int(min(source_width, source_height) * 0.12))

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detect_faces(gray, frontal_cascade, profile_cascade, min_face)
            face_count = len(faces)
            max_faces_in_frame = max(max_faces_in_frame, face_count)

            if face_count > 1:
                multi_face_frames += 1

            best_face = choose_best_face(
                faces,
                current_center_x,
                current_center_y,
                source_width,
                source_height,
            )

            if best_face is not None:
                face_x, face_y, face_w, face_h = best_face
                target_center_x = face_x + face_w / 2
                target_center_y = face_y + face_h * 0.42
                movement_ratio = (
                    abs(target_center_x - current_center_x) / max(1.0, source_width)
                    + abs(target_center_y - current_center_y) / max(1.0, source_height)
                )
                smoothing = fast_smoothing if movement_ratio > 0.16 else steady_smoothing
                current_center_x += (target_center_x - current_center_x) * smoothing
                current_center_y += (target_center_y - current_center_y) * smoothing
                detection_count += 1
            else:
                frame_center_x = source_width / 2
                frame_center_y = source_height / 2
                current_center_x += (frame_center_x - current_center_x) * drift_back
                current_center_y += (frame_center_y - current_center_y) * drift_back

            left = int(
                round(
                    clamp(current_center_x - crop_width / 2, 0, source_width - crop_width)
                )
            )
            top = int(
                round(
                    clamp(current_center_y - crop_height / 2, 0, source_height - crop_height)
                )
            )
            right = left + crop_width
            bottom = top + crop_height

            cropped = frame[top:bottom, left:right]
            resized = cv2.resize(
                cropped,
                (target_width, target_height),
                interpolation=cv2.INTER_CUBIC,
            )
            writer.write(resized)
            frame_count += 1
    finally:
        cap.release()
        writer.release()

    print(
        json.dumps(
            {
                "success": True,
                "frames": frame_count,
                "detections": detection_count,
                "multiFaceFrames": multi_face_frames,
                "maxFacesInFrame": max_faces_in_frame,
                "detectorsUsed": ["frontal", "profile"],
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
