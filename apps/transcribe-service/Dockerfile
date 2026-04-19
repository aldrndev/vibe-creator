FROM python:3.11-slim

WORKDIR /app

ARG INSTALL_DIARIZATION=false

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV WHISPER_DEVICE=cpu
ENV WHISPER_COMPUTE_TYPE=int8
ENV WHISPER_MODEL_SIZE=medium
ENV TRANSCRIBE_ALLOWED_ROOTS=/app/uploads

RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
COPY requirements.diarization.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_DIARIZATION" = "true" ]; then pip install --no-cache-dir -r requirements.diarization.txt; fi

COPY main.py ./main.py

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
