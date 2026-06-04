import type { StreamStatusRecord } from '@/services/live-stream-project-api';

export interface StreamStatusPresentation {
  readonly label: string;
  readonly className: string;
  readonly showPulse?: boolean;
}

export function isLiveLikeStreamStatus(status: StreamStatusRecord['status']): boolean {
  return status === 'LIVE' || status === 'STARTING' || status === 'STOPPING';
}

export function getStreamStatusPresentation(
  stream: Pick<StreamStatusRecord, 'status' | 'durationMinutesBilled'>,
): StreamStatusPresentation {
  if (stream.status === 'LIVE') {
    return {
      label: 'Sedang Live',
      className: 'bg-rose-500 text-white',
      showPulse: true,
    };
  }

  if (stream.status === 'STARTING') {
    return { label: 'Menyiapkan', className: 'bg-primary/15 text-primary' };
  }

  if (stream.status === 'STOPPING') {
    return { label: 'Menghentikan', className: 'bg-amber-500/15 text-amber-400' };
  }

  if (stream.status === 'ENDED') {
    return { label: 'Selesai', className: 'bg-muted text-muted-foreground' };
  }

  if (stream.status === 'FAILED') {
    const billedMinutes = stream.durationMinutesBilled ?? 0;
    return billedMinutes > 0
      ? { label: 'Terputus', className: 'bg-rose-500/15 text-rose-300' }
      : { label: 'Gagal mulai', className: 'bg-amber-500/15 text-amber-300' };
  }

  return { label: stream.status, className: 'bg-muted text-muted-foreground' };
}

export function getStreamStopReasonLabel(reason: string | null | undefined): string {
  switch (reason) {
    case 'ERROR':
      return 'Stream terputus';
    case 'PROCESS_LOST':
      return 'Stream terputus';
    case 'QUOTA_EXHAUSTED':
      return 'Quota habis';
    case 'AUTO_STOP':
      return 'Auto-stop selesai';
    case 'USER_REQUEST':
      return 'Dihentikan manual';
    case 'REPLACED_BY_NEW_STREAM':
      return 'Diganti stream baru';
    case 'ADMIN':
      return 'Dihentikan admin';
    case 'SERVER_RESTART':
      return 'Server restart';
    default:
      return 'Tidak diketahui';
  }
}

export function getStreamQuotaUsageLabel(
  stream: Pick<StreamStatusRecord, 'status' | 'durationMinutesBilled'>,
): string {
  if (isLiveLikeStreamStatus(stream.status)) {
    return 'Live sekarang';
  }

  const billedMinutes = stream.durationMinutesBilled;
  if (billedMinutes === null || typeof billedMinutes === 'undefined') {
    return 'Belum dihitung';
  }

  if (billedMinutes <= 0) {
    return 'Tidak mengurangi quota';
  }

  return `Quota terpakai: ${billedMinutes} menit`;
}

export function formatLiveStreamElapsed(startedAt: string | Date, now: Date): string {
  const started = new Date(startedAt);
  const elapsedMs = Math.max(0, now.getTime() - started.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  return elapsedMinutes < 1 ? '< 1 menit berjalan' : `${elapsedMinutes} menit berjalan`;
}
