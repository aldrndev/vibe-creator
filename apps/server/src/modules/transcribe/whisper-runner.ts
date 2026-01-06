import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RawWhisperSegment {
  start: number; // Seconds
  end: number; // Seconds
  text: string;
  confidence: number;
}

export interface WhisperResult {
  success: boolean;
  language?: string;
  segments?: RawWhisperSegment[];
  error?: string;
}

export class WhisperRunner {
  private scriptPath: string;

  constructor() {
    this.scriptPath = path.join(__dirname, "run_whisper.py");
  }

  async runWhisperOnAudio(audioPath: string): Promise<WhisperResult> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn("python3", [this.scriptPath, audioPath]);

      let stdoutData = "";
      let stderrData = "";

      pythonProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.error(`Whisper process exited with code ${code}`);
          console.error(`Stderr: ${stderrData}`);
          return resolve({
            success: false,
            error: `Process exited with code ${code}. Stderr: ${stderrData}`,
          });
        }

        try {
          const result = JSON.parse(stdoutData) as WhisperResult;
          resolve(result);
        } catch (error) {
          console.error("Failed to parse Whisper output:", stdoutData);
          resolve({
            success: false,
            error: "Failed to parse JSON output from Whisper script.",
          });
        }
      });

      pythonProcess.on("error", (err) => {
        console.error("Failed to spawn python process:", err);
        reject(err);
      });
    });
  }
}

export const whisperRunner = new WhisperRunner();
