
import sys
import json
import os
from faster_whisper import WhisperModel

def transcribe_audio(file_path):
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
        # Use 'base' for speed/accuracy balance in MVP, or 'small' for better Indonesian
        model_size = "base" 
        
        # Run on CPU with INT8 by default (fastest on standard server)
        # If GPU available, use device="cuda", compute_type="float16"
        model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=os.environ.get("HF_HOME"))

        segments, info = model.transcribe(
            file_path, 
            beam_size=5, 
            word_timestamps=False, # We only need segment timestamps
            vad_filter=True
        )

        output_segments = []
        for segment in segments:
            output_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "confidence": segment.avg_logprob
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
    transcribe_audio(file_path)
