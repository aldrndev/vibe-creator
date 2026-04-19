import os
import json
import re
import sys
from faster_whisper import WhisperModel

AUTO_LANGUAGE_ALIASES = {"mixed", "auto"}
LANGUAGE_PATTERN = re.compile(r"^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$", re.IGNORECASE)


def normalize_language(raw_language: str | None) -> str | None:
    if raw_language is None:
        return None

    normalized = raw_language.strip().lower()
    if not normalized:
        return None

    if normalized in AUTO_LANGUAGE_ALIASES:
        return None

    if LANGUAGE_PATTERN.fullmatch(normalized):
        # faster-whisper expects base language code.
        return normalized.split("-", 1)[0]

    return None


def resolve_language(raw_language: str | None) -> str | None:
    requested_language = normalize_language(raw_language)
    if requested_language is not None:
        return requested_language

    # Explicit auto mode from caller should stay in auto-detect mode.
    if raw_language is not None and raw_language.strip().lower() in AUTO_LANGUAGE_ALIASES:
        return None

    default_language = os.environ.get("TRANSCRIBE_LANGUAGE", "mixed")
    return normalize_language(default_language)


def transcribe_audio(file_path, language):
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            result = {
                "error": f"File not found: {file_path}",
                "success": False
            }
            print(json.dumps(result))
            sys.exit(1)

        # Load model
        # Size options: tiny, base, small, medium, large-v2, large-v3
        # Default to 'medium' for stronger multilingual accuracy on CPU.
        model_size = os.environ.get("WHISPER_MODEL_SIZE", "medium")
        
        # Run on CPU with INT8 by default (fastest on standard server)
        # If GPU available, use device="cuda", compute_type="float16"
        model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=os.environ.get("HF_HOME"))

        # Configure VAD parameters from env
        vad_threshold = float(os.environ.get("TRANSCRIBE_VAD_THRESHOLD", "0.72"))
        vad_speech_pad_ms = int(os.environ.get("TRANSCRIBE_VAD_SPEECH_PAD_MS", "120"))
        vad_min_silence_ms = int(os.environ.get("TRANSCRIBE_VAD_MIN_SILENCE_MS", "300"))
        vad_min_speech_ms = int(os.environ.get("TRANSCRIBE_VAD_MIN_SPEECH_MS", "150"))

        segments, info = model.transcribe(
            file_path, 
            beam_size=5, 
            word_timestamps=True,
            vad_filter=True,
            vad_parameters={
                "threshold": vad_threshold,
                "min_silence_duration_ms": vad_min_silence_ms,
                "speech_pad_ms": vad_speech_pad_ms,
                "min_speech_duration_ms": vad_min_speech_ms,
            },
            condition_on_previous_text=False,
            language=language,
        )

        output_segments = []
        for segment in segments:
            words = []
            if segment.words:
                for word in segment.words:
                    if word.start is None or word.end is None:
                        continue
                    words.append({
                        "start": word.start,
                        "end": word.end,
                        "text": word.word.strip(),
                        "confidence": getattr(word, "probability", None)
                    })

            output_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "confidence": segment.avg_logprob,
                "words": words
            })

        result = {
            "success": True,
            "language": info.language,
            "language_probability": info.language_probability,
            "duration": info.duration,
            "segments": output_segments
        }

        print(json.dumps(result))

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing file path argument"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    language_arg = sys.argv[2] if len(sys.argv) >= 3 else None
    target_language = resolve_language(language_arg)
    transcribe_audio(file_path, target_language)
