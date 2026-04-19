# Transcribe Service (FastAPI)

Dedicated Faster-Whisper HTTP service for AI Director clip transcription.

## Local Run

```bash
cd apps/transcribe-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8765
```

Enable diarization (optional):

```bash
pip install -r requirements.diarization.txt
export TRANSCRIBE_DIARIZATION_ENABLED=true
export TRANSCRIBE_DIARIZATION_AUTH_TOKEN=hf_xxx
```

## Environment Variables

- `WHISPER_MODEL_SIZE` (`tiny|base|small|medium|large-v2|large-v3`, default `medium`)
- `WHISPER_DEVICE` (default `cpu`)
- `WHISPER_COMPUTE_TYPE` (default `int8`)
- `TRANSCRIBE_SERVICE_TOKEN` (optional bearer token)
- `TRANSCRIBE_ALLOWED_ROOTS` (optional comma-separated allowed file roots; if empty, all paths allowed)
- `HF_HOME` (optional model cache directory)
- `TRANSCRIBE_LANGUAGE` (ISO 639 code e.g. `id`, `en`, `pt`, `es`, `ja` — or `mixed`/`auto` for auto-detect, default `mixed`)
- `TRANSCRIBE_DIARIZATION_ENABLED` (`true|false`, default `false`)
- `TRANSCRIBE_DIARIZATION_AUTH_TOKEN` (HuggingFace token for pyannote models)
- `TRANSCRIBE_DIARIZATION_MODEL` (default `pyannote/speaker-diarization-3.1`)
- `TRANSCRIBE_DIARIZATION_DEVICE` (default `cpu`)
- `TRANSCRIBE_VAD_THRESHOLD` (float `0.0 - 1.0`, default `0.72`)
- `TRANSCRIBE_VAD_SPEECH_PAD_MS` (int, default `120`)
- `TRANSCRIBE_VAD_MIN_SILENCE_MS` (int, default `300`)
- `TRANSCRIBE_VAD_MIN_SPEECH_MS` (int, default `150`)

## Endpoints

- `GET /health`
- `POST /transcribe`
  - Body: `{ "audioPath": string, "wordTimestamps": boolean, "language"?: string }`
  - Language accepts any ISO 639 code (e.g. `"id"`, `"en"`, `"pt-br"`, `"ja"`, `"es"`) or `"mixed"`/`"auto"` for auto-detection.
