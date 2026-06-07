import { paymentService } from '@/modules/payment/payment.service';

type DirectorExportQuality = '720p' | '1080p';
type DirectorExportAspectRatio = '9:16' | '16:9' | '1:1';

interface DirectorExportActor {
  readonly id: string;
  readonly role: string;
}

/**
 * Resolve the effective AI Director export quality from server-side entitlement.
 */
export async function resolveEffectiveDirectorExportQuality(
  user: DirectorExportActor,
): Promise<DirectorExportQuality> {
  if (user.role === 'ADMIN') {
    return '1080p';
  }

  const subscription = await paymentService.getSubscription(user.id);
  return subscription.tier === 'FREE' ? '720p' : '1080p';
}

/**
 * Keep AI Director final output as portrait Short while preserving other export options.
 */
export async function normalizeDirectorExportOptions<
  T extends {
    readonly aspectRatio?: DirectorExportAspectRatio;
    readonly quality?: DirectorExportQuality;
  },
>(
  user: DirectorExportActor,
  options: T,
): Promise<T & { aspectRatio: '9:16'; quality: DirectorExportQuality }> {
  const quality = await resolveEffectiveDirectorExportQuality(user);
  return {
    ...options,
    aspectRatio: '9:16',
    quality,
  };
}
