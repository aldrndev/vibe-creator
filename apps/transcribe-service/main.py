from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import os
from pathlib import Path
from threading import Lock
from typing import Annotated, Any, Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from faster_whisper import WhisperModel

app = FastAPI(title="Vibe Creator Transcribe Service", version="1.0.0")

_MODEL: WhisperModel | None = None
_MODEL_LOCK = Lock()
_DIARIZATION_PIPELINE: Any | None = None
_DIARIZATION_LOCK = Lock()
_DIARIZATION_INIT_ERROR: str | None = None


@dataclass(frozen=True)
class DiarizationTurn:
    start: float
    end: float
    speaker: str


class TranscribeWord(BaseModel):
    start: float
    end: float
    text: str
    confidence: float | None = None
    speaker: str | None = None


class TranscribeSegment(BaseModel):
    start: float
    end: float
    text: str
    confidence: float
    words: list[TranscribeWord] = Field(default_factory=list)
    speaker: str | None = None


class TranscribeDiarization(BaseModel):
    enabled: bool
    applied: bool
    provider: str | None = None
    speakers: list[str] = Field(default_factory=list)
    reason: str | None = None


class TranscribeRequest(BaseModel):
    audioPath: str = Field(min_length=1)
    wordTimestamps: bool = True
    language: Literal["id", "en", "mixed"] | None = None


class TranscribeResponse(BaseModel):
    success: bool
    language: str | None = None
    segments: list[TranscribeSegment] | None = None
    diarization: TranscribeDiarization | None = None
    error: str | None = None


class HealthResponse(BaseModel):
    status: str
    modelLoaded: bool
    diarizationEnabled: bool


def _allowed_roots() -> list[Path]:
    roots = os.environ.get("TRANSCRIBE_ALLOWED_ROOTS")
    if not roots:
        return []
    result: list[Path] = []
    for raw_root in roots.split(","):
        clean = raw_root.strip()
        if not clean:
            continue
        result.append(Path(clean).resolve())
    return result


def _validate_audio_path(audio_path: str) -> Path:
    resolved = Path(audio_path).expanduser().resolve()
    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail=f"Audio file not found: {audio_path}")

    allowed_roots = _allowed_roots()
    if not allowed_roots:
        return resolved

    for allowed_root in allowed_roots:
        try:
            resolved.relative_to(allowed_root)
            return resolved
        except ValueError:
            continue

    raise HTTPException(
        status_code=403,
        detail=(
            "Audio path is outside TRANSCRIBE_ALLOWED_ROOTS. "
            "Set TRANSCRIBE_ALLOWED_ROOTS to include this location."
        ),
    )


def _build_model() -> WhisperModel:
    model_size = os.environ.get("WHISPER_MODEL_SIZE", "small")
    device = os.environ.get("WHISPER_DEVICE", "cpu")
    compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
    hf_home = os.environ.get("HF_HOME")

    return WhisperModel(
        model_size,
        device=device,
        compute_type=compute_type,
        download_root=hf_home,
    )


def _get_model() -> WhisperModel:
    global _MODEL

    if _MODEL is not None:
        return _MODEL

    with _MODEL_LOCK:
        if _MODEL is None:
            _MODEL = _build_model()

    return _MODEL


def _parse_bool_env(env_key: str, default: bool = False) -> bool:
    raw_value = os.environ.get(env_key)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def _is_diarization_enabled() -> bool:
    return _parse_bool_env("TRANSCRIBE_DIARIZATION_ENABLED", default=False)


def _resolve_diarization_token() -> str | None:
    for env_key in (
        "TRANSCRIBE_DIARIZATION_AUTH_TOKEN",
        "HUGGINGFACE_TOKEN",
        "HF_TOKEN",
    ):
        token = os.environ.get(env_key, "").strip()
        if token:
            return token
    return None


def _build_diarization_pipeline() -> Any:
    # Lazy import so base transcription still works when diarization extra isn't installed.
    from pyannote.audio import Pipeline  # type: ignore[import-not-found]

    model_name = os.environ.get(
        "TRANSCRIBE_DIARIZATION_MODEL",
        "pyannote/speaker-diarization-3.1",
    )
    auth_token = _resolve_diarization_token()
    if not auth_token:
        raise RuntimeError(
            "TRANSCRIBE_DIARIZATION_AUTH_TOKEN (or HUGGINGFACE_TOKEN/HF_TOKEN) is required "
            "when TRANSCRIBE_DIARIZATION_ENABLED=true"
        )

    pipeline = Pipeline.from_pretrained(model_name, use_auth_token=auth_token)
    device_name = os.environ.get("TRANSCRIBE_DIARIZATION_DEVICE", "cpu").strip()
    if device_name:
        try:
            import torch  # type: ignore[import-not-found]

            pipeline.to(torch.device(device_name))
        except Exception:
            # Keep CPU default if torch device switching is unavailable.
            pass

    return pipeline


def _get_diarization_pipeline() -> Any | None:
    global _DIARIZATION_PIPELINE, _DIARIZATION_INIT_ERROR

    if not _is_diarization_enabled():
        return None

    if _DIARIZATION_PIPELINE is not None:
        return _DIARIZATION_PIPELINE

    if _DIARIZATION_INIT_ERROR is not None:
        return None

    with _DIARIZATION_LOCK:
        if _DIARIZATION_PIPELINE is not None:
            return _DIARIZATION_PIPELINE
        if _DIARIZATION_INIT_ERROR is not None:
            return None

        try:
            _DIARIZATION_PIPELINE = _build_diarization_pipeline()
        except Exception as err:  # noqa: BLE001
            _DIARIZATION_INIT_ERROR = str(err)
            return None

    return _DIARIZATION_PIPELINE


def _segment_overlap_seconds(
    left_start: float, left_end: float, right_start: float, right_end: float
) -> float:
    return max(0.0, min(left_end, right_end) - max(left_start, right_start))


def _resolve_speaker_for_range(
    turns: list[DiarizationTurn], start: float, end: float
) -> str | None:
    if not turns:
        return None

    bounded_end = end if end > start else start + 0.01
    speaker_overlap: dict[str, float] = {}
    for turn in turns:
        overlap = _segment_overlap_seconds(start, bounded_end, turn.start, turn.end)
        if overlap <= 0:
            continue
        speaker_overlap[turn.speaker] = speaker_overlap.get(turn.speaker, 0.0) + overlap

    if speaker_overlap:
        return max(speaker_overlap.items(), key=lambda item: item[1])[0]

    midpoint = (start + bounded_end) / 2
    for turn in turns:
        if turn.start <= midpoint <= turn.end:
            return turn.speaker

    return None


def _resolve_speaker_from_words(words: list[TranscribeWord]) -> str | None:
    speakers = [word.speaker for word in words if word.speaker]
    if not speakers:
        return None

    return Counter(speakers).most_common(1)[0][0]


def _run_diarization(audio_file_path: Path) -> tuple[list[DiarizationTurn], TranscribeDiarization]:
    if not _is_diarization_enabled():
        return [], TranscribeDiarization(enabled=False, applied=False, reason="disabled")

    pipeline = _get_diarization_pipeline()
    if pipeline is None:
        return [], TranscribeDiarization(
            enabled=True,
            applied=False,
            provider="pyannote.audio",
            reason=_DIARIZATION_INIT_ERROR or "Diarization pipeline unavailable",
        )

    try:
        diarization = pipeline(str(audio_file_path))
        turns: list[DiarizationTurn] = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            start = float(turn.start)
            end = float(turn.end)
            speaker_label = str(speaker).strip()
            if end <= start or not speaker_label:
                continue
            turns.append(DiarizationTurn(start=start, end=end, speaker=speaker_label))

        speakers = sorted({turn.speaker for turn in turns})
        return turns, TranscribeDiarization(
            enabled=True,
            applied=bool(turns),
            provider="pyannote.audio",
            speakers=speakers,
            reason=None if turns else "No speaker turns detected",
        )
    except Exception as err:  # noqa: BLE001
        return [], TranscribeDiarization(
            enabled=True,
            applied=False,
            provider="pyannote.audio",
            reason=str(err),
        )


def _is_authorized(authorization_header: str | None) -> bool:
    token = os.environ.get("TRANSCRIBE_SERVICE_TOKEN")
    if not token:
        return True

    expected = f"Bearer {token}"
    return authorization_header == expected


def _serialize_segments(
    segments: Any, diarization_turns: list[DiarizationTurn]
) -> list[TranscribeSegment]:
    output: list[TranscribeSegment] = []

    for segment in segments:
        words: list[TranscribeWord] = []
        if segment.words:
            for word in segment.words:
                if word.start is None or word.end is None:
                    continue
                word_start = float(word.start)
                word_end = float(word.end)
                words.append(
                    TranscribeWord(
                        start=word_start,
                        end=word_end,
                        text=word.word.strip(),
                        confidence=float(word.probability)
                        if getattr(word, "probability", None) is not None
                        else None,
                        speaker=_resolve_speaker_for_range(
                            diarization_turns, word_start, word_end
                        ),
                    )
                )

        segment_start = float(segment.start)
        segment_end = float(segment.end)
        output.append(
            TranscribeSegment(
                start=segment_start,
                end=segment_end,
                text=segment.text.strip(),
                confidence=float(segment.avg_logprob),
                words=words,
                speaker=_resolve_speaker_for_range(
                    diarization_turns, segment_start, segment_end
                )
                or _resolve_speaker_from_words(words),
            )
        )

    return output


def _resolve_language(language: str | None) -> Literal["id", "en"] | None:
    if language in {"id", "en"}:
        return language

    if language == "mixed":
        return None

    env_default = os.environ.get("TRANSCRIBE_LANGUAGE", "mixed").strip().lower()
    if env_default == "id":
        return "id"
    if env_default == "en":
        return "en"
    if env_default == "mixed":
        return None

    return None


@app.get("/health")
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        modelLoaded=_MODEL is not None,
        diarizationEnabled=_is_diarization_enabled(),
    )


@app.post(
    "/transcribe",
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Audio path outside TRANSCRIBE_ALLOWED_ROOTS"},
        404: {"description": "Audio file not found"},
    },
)
def transcribe(
    payload: TranscribeRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> TranscribeResponse:
    if not _is_authorized(authorization):
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        audio_file_path = _validate_audio_path(payload.audioPath)
        model = _get_model()

        beam_size = int(os.environ.get("WHISPER_BEAM_SIZE", "5"))
        target_language = _resolve_language(payload.language)
        segments, info = model.transcribe(
            str(audio_file_path),
            beam_size=beam_size,
            word_timestamps=payload.wordTimestamps,
            vad_filter=False,
            condition_on_previous_text=False,
            language=target_language,
        )
        diarization_turns, diarization_meta = _run_diarization(audio_file_path)

        return TranscribeResponse(
            success=True,
            language=info.language,
            segments=_serialize_segments(segments, diarization_turns),
            diarization=diarization_meta,
        )
    except HTTPException:
        raise
    except Exception as err:  # noqa: BLE001
        return TranscribeResponse(success=False, error=str(err))
