import { env } from '@/config/env';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Verify Turnstile token with Cloudflare API
 * Returns true if token is valid, false otherwise
 */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  // Skip verification in development if no secret key
  if (env.NODE_ENV === 'development' && !env.TURNSTILE_SECRET_KEY) {
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (ip) {
      formData.append('remoteip', ip);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const result = await response.json() as TurnstileVerifyResponse;
    return result.success;
  } catch {
    // Log error but don't block in case of verification service failure
    return env.NODE_ENV === 'development';
  }
}
