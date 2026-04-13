import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '@/config/env';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import { isTranscribeLanguage, type TranscribeLanguage } from './transcribe-language';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RawWhisperSegment {
  start: number; // Seconds
  end: number; // Seconds
  text: string;
  confidence: number;
  words?: RawWhisperWord[];
  speaker?: string;
}

export interface RawWhisperWord {
  start: number; // Seconds
  end: number; // Seconds
  text: string;
  confidence?: number;
  speaker?: string;
}

export interface WhisperDiarizationMeta {
  enabled: boolean;
  applied: boolean;
  provider?: string;
  speakers?: string[];
  reason?: string;
}

export interface WhisperResult {
  success: boolean;
  language?: string;
  segments?: RawWhisperSegment[];
  diarization?: WhisperDiarizationMeta;
  error?: string;
  provider?: 'http' | 'local';
}

const transcribeHttpBreaker = createCircuitBreaker(
  async (...args: unknown[]): Promise<Response> => {
    const [url, requestBody] = args as [string, RequestInit];
    return fetch(url, requestBody);
  },
  {
    serviceName: 'Transcribe Service',
    timeout: env.TRANSCRIBE_HTTP_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    allowRetry: true,
  },
);

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWhisperDiarizationMeta(value: unknown): value is WhisperDiarizationMeta {
  if (!isObjectRecord(value)) {
    return false;
  }

  if (typeof value.enabled !== 'boolean' || typeof value.applied !== 'boolean') {
    return false;
  }

  if (value.provider !== undefined && typeof value.provider !== 'string') {
    return false;
  }

  if (
    value.speakers !== undefined &&
    (!Array.isArray(value.speakers) ||
      value.speakers.some((speaker) => typeof speaker !== 'string'))
  ) {
    return false;
  }

  if (value.reason !== undefined && typeof value.reason !== 'string') {
    return false;
  }

  return true;
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

  private parseWhisperResult(payload: unknown, provider: 'http' | 'local'): WhisperResult {
    if (!isObjectRecord(payload)) {
      return {
        success: false,
        error: 'Transcription payload is not a valid object.',
        provider,
      };
    }

    const success = payload.success === true;
    const rawLanguage = typeof payload.language === 'string' ? payload.language : undefined;
    const language = isTranscribeLanguage(rawLanguage) ? rawLanguage : undefined;
    const segments = Array.isArray(payload.segments)
      ? (payload.segments as RawWhisperSegment[])
      : undefined;
    const diarization = isWhisperDiarizationMeta(payload.diarization)
      ? payload.diarization
      : undefined;
    const error = typeof payload.error === 'string' ? payload.error : undefined;

    return {
      success,
      language,
      segments,
      diarization,
      error: success ? undefined : (error ?? 'Transcription request failed.'),
      provider,
    };
  }

  private shouldUseHttpProvider(): boolean {
    if (env.TRANSCRIBE_PROVIDER === 'local') {
      return false;
    }

    if (env.TRANSCRIBE_PROVIDER === 'http') {
      return true;
    }

    return Boolean(env.TRANSCRIBE_SERVICE_URL);
  }

  private async runWhisperViaHttp(
    audioPath: string,
    language: TranscribeLanguage,
  ): Promise<WhisperResult> {
    const serviceUrl = env.TRANSCRIBE_SERVICE_URL;
    if (!serviceUrl) {
      return {
        success: false,
        error: 'TRANSCRIBE_SERVICE_URL is not configured.',
        provider: 'http',
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (env.TRANSCRIBE_SERVICE_TOKEN) {
      headers.Authorization = `Bearer ${env.TRANSCRIBE_SERVICE_TOKEN}`;
    }

    try {
      const response = await transcribeHttpBreaker.fire(
        `${serviceUrl.replace(/\/$/, '')}/transcribe`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            audioPath,
            wordTimestamps: true,
            language,
          }),
          signal: AbortSignal.timeout(env.TRANSCRIBE_HTTP_TIMEOUT_MS),
        },
      );

      const rawBody = await response.text();
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${rawBody.slice(0, 200)}`,
          provider: 'http',
        };
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return {
          success: false,
          error: 'Transcribe service returned non-JSON payload.',
          provider: 'http',
        };
      }

      return this.parseWhisperResult(payload, 'http');
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Transcribe HTTP request failed.',
        provider: 'http',
      };
    }
  }

  private async runWhisperLocal(
    audioPath: string,
    language: TranscribeLanguage,
  ): Promise<WhisperResult> {
    return new Promise((resolve, reject) => {
      const pythonCommand = this.getPythonCommand();
      const pythonProcess = spawn(pythonCommand, [this.scriptPath, audioPath, language]);

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
            provider: 'local',
          });
        }

        try {
          const result = JSON.parse(stdoutData) as unknown;
          resolve(this.parseWhisperResult(result, 'local'));
        } catch {
          logger.error({ output: stdoutData.slice(0, 500) }, 'Failed to parse Whisper output');
          resolve({
            success: false,
            error: 'Failed to parse JSON output from Whisper script.',
            provider: 'local',
          });
        }
      });

      pythonProcess.on('error', (err) => {
        logger.error({ err, pythonCommand }, 'Failed to spawn python process');
        reject(err);
      });
    });
  }

  async runWhisperOnAudio(
    audioPath: string,
    language: TranscribeLanguage = env.TRANSCRIBE_LANGUAGE,
  ): Promise<WhisperResult> {
    if (this.shouldUseHttpProvider()) {
      const httpResult = await this.runWhisperViaHttp(audioPath, language);
      if (httpResult.success) {
        return httpResult;
      }

      if (!env.TRANSCRIBE_ALLOW_LOCAL_FALLBACK) {
        return httpResult;
      }

      logger.warn(
        {
          provider: env.TRANSCRIBE_PROVIDER,
          error: httpResult.error,
        },
        'HTTP transcribe failed, falling back to local whisper runner',
      );
    }

    return this.runWhisperLocal(audioPath, language);
  }
}

export const whisperRunner = new WhisperRunner();
