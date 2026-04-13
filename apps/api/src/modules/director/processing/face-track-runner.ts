import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@/lib/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FaceTrackRequest {
  inputPath: string;
  outputPath: string;
  targetWidth: number;
  targetHeight: number;
  focusProfile?: 'auto' | 'subject-center' | 'object-center';
}

export interface FaceTrackResult {
  success: boolean;
  frames?: number;
  detections?: number;
  objectDetections?: number;
  multiFaceFrames?: number;
  maxFacesInFrame?: number;
  targetSwitches?: number;
  snapRepositions?: number;
  sceneCuts?: number;
  focusProfile?: 'auto' | 'subject-center' | 'object-center';
  trackingPreset?: 'auto' | 'subject-center' | 'object-center';
  detectorsUsed?: string[];
  error?: string;
}

export class FaceTrackRunner {
  private readonly scriptPath: string;
  private readonly projectPythonPath: string;

  constructor() {
    this.scriptPath = path.join(__dirname, 'run_face_tracking.py');
    this.projectPythonPath = path.resolve(__dirname, '../../../../venv/bin/python');
  }

  private getPythonCommand(): string {
    if (existsSync(this.projectPythonPath)) {
      return this.projectPythonPath;
    }

    return 'python3';
  }

  async trackPortraitClip(request: FaceTrackRequest): Promise<FaceTrackResult> {
    return new Promise((resolve, reject) => {
      const pythonCommand = this.getPythonCommand();
      const pythonProcess = spawn(pythonCommand, [
        this.scriptPath,
        request.inputPath,
        request.outputPath,
        String(request.targetWidth),
        String(request.targetHeight),
        request.focusProfile ?? 'auto',
      ]);

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
          logger.error({ code, stderr: stderrData }, 'Face tracking process exited with error');
          resolve({
            success: false,
            error: `Process exited with code ${code}. Stderr: ${stderrData}`,
          });
          return;
        }

        try {
          const result = JSON.parse(stdoutData) as FaceTrackResult;
          resolve(result);
        } catch {
          logger.error(
            { output: stdoutData.slice(0, 500) },
            'Failed to parse face tracking output',
          );
          resolve({
            success: false,
            error: 'Failed to parse JSON output from face tracking script.',
          });
        }
      });

      pythonProcess.on('error', (error) => {
        logger.error({ error, pythonCommand }, 'Failed to spawn face tracking process');
        reject(error);
      });
    });
  }
}

export const faceTrackRunner = new FaceTrackRunner();
