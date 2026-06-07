interface DirectorApiErrorShape {
  readonly message: string;
  readonly statusCode: number;
  readonly errorCode?: string;
}

export type DirectorImportError = Error & Partial<DirectorApiErrorShape>;

interface DirectorApiEnvelope<TData> {
  readonly success?: boolean;
  readonly data?: TData;
  readonly message?: unknown;
  readonly errorCode?: unknown;
  readonly error?: {
    readonly message?: unknown;
    readonly code?: unknown;
    readonly errorCode?: unknown;
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readApiErrorCode(data: DirectorApiEnvelope<unknown>): string | undefined {
  return (
    readString(data.error?.code) ?? readString(data.error?.errorCode) ?? readString(data.errorCode)
  );
}

export function createDirectorImportError(
  response: Response,
  data: DirectorApiEnvelope<unknown>,
  fallbackMessage: string,
): DirectorImportError {
  const message = readString(data.error?.message) ?? readString(data.message) ?? fallbackMessage;
  return Object.assign(new Error(message), {
    statusCode: response.status,
    errorCode: readApiErrorCode(data),
  }) as DirectorImportError;
}

export function isExpiredDirectorSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const directorError = error as DirectorImportError;
  const normalizedMessage = directorError.message.toLowerCase();
  const normalizedErrorCode = directorError.errorCode?.toUpperCase();

  return (
    directorError.statusCode === 410 ||
    normalizedErrorCode === 'SESSION_EXPIRED' ||
    normalizedMessage.includes('gone') ||
    normalizedMessage.includes('expired') ||
    normalizedMessage.includes('kedaluwarsa')
  );
}

function getNonEmptyMessage(message: string | undefined): string | null {
  return message && message.trim().length > 0 ? message : null;
}

function getDirectorImportErrorMessageByCode(
  errorCode: string | undefined,
  rawMessage: string,
): string | null {
  switch (errorCode) {
    case 'DIRECTOR_VIDEO_TOO_SHORT':
      return 'Video terlalu pendek. AI Director butuh video minimal 5 menit. Untuk video pendek, gunakan Video Studio.';
    case 'DIRECTOR_VIDEO_TOO_LONG':
      return (
        getNonEmptyMessage(rawMessage) ??
        'Durasi video melebihi batas paket kamu. Pilih video yang lebih pendek atau upgrade paket.'
      );
    case 'DIRECTOR_FILE_TOO_LARGE':
      return (
        getNonEmptyMessage(rawMessage) ??
        'File melebihi batas paket kamu. Pilih video yang lebih kecil, kompres video, atau upgrade paket.'
      );
    case 'DIRECTOR_UPLOAD_INTERRUPTED':
      return 'Upload terputus. Coba lagi dengan koneksi stabil, atau gunakan Import URL jika video tersedia di sumber yang didukung.';
    case 'DIRECTOR_URL_TOO_LARGE':
      return 'Video dari URL melebihi batas paket kamu. Pilih video yang lebih kecil, video yang lebih pendek, atau upgrade paket.';
    case 'UNSUPPORTED_SOURCE':
      return 'Sumber URL belum didukung. Gunakan YouTube, TikTok, Instagram, Facebook, atau upload file langsung.';
    default:
      return null;
  }
}

function isShortVideoMessage(message: string): boolean {
  return (
    message.includes('terlalu pendek') ||
    message.includes('too short') ||
    message.includes('minimal 5 menit') ||
    message.includes('minimum 5 minutes')
  );
}

function isUnsupportedSourceMessage(message: string): boolean {
  return message.includes('not supported') || message.includes('belum didukung');
}

export function normalizeDirectorImportErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const rawMessage = error instanceof Error ? error.message : fallbackMessage;
  const normalizedMessage = rawMessage.toLowerCase();
  const normalizedErrorCode =
    error instanceof Error ? (error as DirectorImportError).errorCode?.toUpperCase() : undefined;

  const messageByCode = getDirectorImportErrorMessageByCode(normalizedErrorCode, rawMessage);
  if (messageByCode) return messageByCode;

  if (isShortVideoMessage(normalizedMessage)) {
    return 'Video terlalu pendek. AI Director butuh video minimal 5 menit. Untuk video pendek, gunakan Video Studio.';
  }

  if (isUnsupportedSourceMessage(normalizedMessage)) {
    return 'Sumber URL belum didukung. Gunakan YouTube, TikTok, Instagram, Facebook, atau upload file langsung.';
  }

  return getNonEmptyMessage(rawMessage) ?? fallbackMessage;
}

async function readDirectorApiEnvelope<TData>(
  response: Response,
): Promise<DirectorApiEnvelope<TData>> {
  try {
    return (await response.json()) as DirectorApiEnvelope<TData>;
  } catch {
    return {};
  }
}

export async function readDirectorApiData<TData>(
  response: Response,
  fallbackMessage: string,
): Promise<TData> {
  const data = await readDirectorApiEnvelope<TData>(response);

  if (response.ok && data.success && data.data !== undefined) {
    return data.data;
  }

  throw createDirectorImportError(response, data, fallbackMessage);
}

export async function readDirectorApiSuccess(
  response: Response,
  fallbackMessage: string,
): Promise<void> {
  const data = await readDirectorApiEnvelope<unknown>(response);

  if (response.ok && data.success) {
    return;
  }

  throw createDirectorImportError(response, data, fallbackMessage);
}
