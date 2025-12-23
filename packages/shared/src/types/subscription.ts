export type SubscriptionTier = 'FREE' | 'CREATOR' | 'PRO';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type ExportFormat = 'MP4' | 'WEBM' | 'MOV';
export type ExportResolution = '720P' | '1080P' | '4K';
export type ExportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  exportsUsed: number;
  exportsLimit: number;
  validUntil: Date;
  xenditSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionTierConfig {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  features: string[];
  exportsLimit: number;
  maxResolution: ExportResolution;
  watermark: boolean;
  priorityQueue: boolean;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  FREE: {
    tier: 'FREE',
    name: 'Gratis',
    priceMonthly: 0,
    features: [
      'Preview penuh',
      'Prompt Builder lengkap',
      'Edit video',
      'URL Import',
      'Rekam suara',
    ],
    exportsLimit: 0, // No export
    maxResolution: '720P',
    watermark: true,
    priorityQueue: false,
  },
  CREATOR: {
    tier: 'CREATOR',
    name: 'Creator',
    priceMonthly: 99000,
    features: [
      'Semua fitur Gratis',
      'Export 720p-1080p',
      '20 export/bulan',
      'Tanpa watermark',
    ],
    exportsLimit: 20,
    maxResolution: '1080P',
    watermark: false,
    priorityQueue: false,
  },
  PRO: {
    tier: 'PRO',
    name: 'Pro',
    priceMonthly: 249000,
    features: [
      'Semua fitur Creator',
      'Export hingga 4K',
      'Unlimited export',
      'Priority queue',
      'Live streaming',
    ],
    exportsLimit: -1, // Unlimited
    maxResolution: '4K',
    watermark: false,
    priorityQueue: true,
  },
};

export interface ExportHistory {
  id: string;
  userId: string;
  projectId: string;
  format: ExportFormat;
  resolution: ExportResolution;
  status: ExportStatus;
  r2Key: string | null;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CreateExportInput {
  projectId: string;
  format: ExportFormat;
  resolution: ExportResolution;
}

export interface CheckoutInput {
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResponse {
  invoiceUrl: string;
  invoiceId: string;
}
