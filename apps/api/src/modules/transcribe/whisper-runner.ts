import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@/lib/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RawWhisperSegment {
  start: number; // Seconds
  end: number; // Seconds
  text: string;
  confidence: number;
  words?: RawWhisperWord[];
}

export interface RawWhisperWord {
  start: number; // Seconds
  end: number; // Seconds
  text: string;
  confidence?: number;
}

export interface WhisperResult {
  success: boolean;
  language?: string;
  segments?: RawWhisperSegment[];
  error?: string;
}

export class WhisperRunner {
  private readonly scriptPath: string;
  private readonly projectPythonPath: string;

  constructor() {
    this.scriptPath = path.join(__dirname, 'run_whisper.py');
    this.projectPythonPath = path.resolve(__dirname, '../../../venv/bin/python');
  }

  private getPythonCommand(): string {
    if (existsSync(this.projectPythonPath)) {
      return this.projectPythonPath;
    }

    return 'python3';
  }

  async runWhisperOnAudio(audioPath: string): Promise<WhisperResult> {
    return new Promise((resolve, reject) => {
      const pythonCommand = this.getPythonCommand();
      const pythonProcess = spawn(pythonCommand, [this.scriptPath, audioPath]);

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error({ code, stderr: stderrData }, 'Whisper process exited with error');
          return resolve({
            success: false,
            error: `Process exited with code ${code}. Stderr: ${stderrData}`,
          });
        }

        try {
          const result = JSON.parse(stdoutData) as WhisperResult;
          resolve(result);
        } catch {
          logger.error({ output: stdoutData.slice(0, 500) }, 'Failed to parse Whisper output');
          resolve({
            success: false,
            error: 'Failed to parse JSON output from Whisper script.',
          });
        }
      });

      pythonProcess.on('error', (err) => {
        logger.error({ err, pythonCommand }, 'Failed to spawn python process');
        reject(err);
      });
    });
  }
}

export const whisperRunner = new WhisperRunner();
