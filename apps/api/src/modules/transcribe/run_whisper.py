
import os
import json
import sys
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
        # Default to 'small' for stronger multilingual accuracy on CPU.
        model_size = os.environ.get("WHISPER_MODEL_SIZE", "small")
        
        # Run on CPU with INT8 by default (fastest on standard server)
        # If GPU available, use device="cuda", compute_type="float16"
        model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=os.environ.get("HF_HOME"))

        segments, info = model.transcribe(
            file_path, 
            beam_size=5, 
            word_timestamps=True,
            vad_filter=False,
            condition_on_previous_text=False
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
    transcribe_audio(file_path)
