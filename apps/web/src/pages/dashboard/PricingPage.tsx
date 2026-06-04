import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Crown, Download, Sparkles, Video, Zap } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { Badge, Button, Card, CardBody, Progress } from '@/components/ui';
import { logger } from '@/lib/logger';
import { useMutableSearchParams } from '@/lib/route-search';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

interface PricingTier {
  id: 'FREE' | 'CREATOR' | 'PRO';
  name: string;
  price: number;
  period: string;
  description: string;
  bestFor: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    period: 'selamanya',
    description: 'Untuk memulai kreasi video',
    bestFor: 'Eksperimen dan draft ringan',
    features: [
      '5 export setiap bulan',
      'Resolusi 720p dengan watermark',
      'Video Studio untuk edit dasar',
      'AI Director starter',
      'Riwayat project aktif',
    ],
    icon: <Zap size={20} />,
  },
  {
    id: 'CREATOR',
    name: 'Creator',
    price: 99000,
    period: '/bulan',
    description: 'Untuk content creator aktif',
    bestFor: 'Produksi short dan konten rutin',
    features: [
      '50 export setiap bulan',
      'Resolusi 1080p Full HD',
      'Tanpa watermark',
      'Loop Creator dan Reaction Recorder',
      'Support prioritas',
    ],
    icon: <Sparkles size={20} />,
    popular: true,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 199000,
    period: '/bulan',
    description: 'Untuk profesional & studio',
    bestFor: 'Volume tinggi dan workflow premium',
    features: [
      'Export unlimited',
      'Resolusi hingga 4K',
      'Tanpa watermark',
      'Semua tool premium',
      'Priority render',
      'Live Streaming quota besar',
    ],
    icon: <Crown size={20} />,
  },
];

const createInvoiceResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      invoiceUrl: z
        .string()
        .refine(
          (value) => value.startsWith('/payment/mock') || /^https?:\/\//.test(value),
          'Invalid payment redirect URL',
        ),
      paymentId: z.string(),
    })
    .optional(),
  error: z.union([z.string(), z.object({ message: z.string().optional() })]).optional(),
});

function getPaymentErrorMessage(payload: unknown, fallback: string): string {
  const parsed = createInvoiceResponseSchema.safeParse(payload);
  if (!parsed.success) return fallback;

  const { error } = parsed.data;
  if (typeof error === 'string') return error;
  return error?.message || fallback;
}

export function PricingPage() {
  const [searchParams] = useMutableSearchParams();
  const { subscription, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const paymentStatus = searchParams.get('payment');
  const currentTier = subscription?.tier || 'FREE';
  const isAdmin = user?.role === 'ADMIN';
  const exportsLimit = subscription?.exportsLimit ?? 5;
  const exportsUsed = subscription?.exportsUsed ?? 0;
  const isUnlimited = isAdmin || exportsLimit >= 999_999;
  const usagePercent = isUnlimited
    ? 0
    : Math.min(100, Math.round((exportsUsed / Math.max(exportsLimit, 1)) * 100));
  const remainingExports = isUnlimited ? null : Math.max(0, exportsLimit - exportsUsed);
  const currentPlanLabel = isAdmin ? 'Admin' : currentTier[0] + currentTier.slice(1).toLowerCase();

  const handleUpgrade = async (tier: 'CREATOR' | 'PRO') => {
    try {
      setIsLoading(tier);
      setError(null);

      const response = await authFetch('/api/v1/payment/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const payload = await response.json().catch(() => null);
      const data = createInvoiceResponseSchema.safeParse(payload);

      if (!response.ok || !data.success || !data.data.success || !data.data.data) {
        throw new Error(getPaymentErrorMessage(payload, 'Gagal membuat invoice pembayaran'));
      }

      const { invoiceUrl, paymentId } = data.data.data;

      if (invoiceUrl.startsWith('/payment/mock')) {
        // Confirm mock payment
        await authFetch('/api/v1/payment/mock-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId }),
        });

        setSuccessMessage('Development mode: Payment simulated successfully!');
        globalThis.setTimeout(() => globalThis.location.reload(), 1500);
      } else {
        // Redirect to Xendit payment page
        globalThis.location.href = invoiceUrl;
      }
    } catch (err) {
      logger.error('Upgrade failed', err);
      setError(err instanceof Error ? err.message : 'Gagal memproses pembayaran');
    } finally {
      setIsLoading(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderTierAction = (tier: PricingTier) => {
    if (isAdmin) {
      return (
        <Button className="w-full rounded-xl" variant="secondary" disabled>
          Admin Access
        </Button>
      );
    }

    switch (tier.id) {
      case 'FREE':
        return (
          <Button className="w-full rounded-xl" variant="secondary" disabled>
            {currentTier === 'FREE' ? 'Plan Saat Ini' : 'Free'}
          </Button>
        );
      case 'CREATOR':
      case 'PRO': {
        const upgradeTier = tier.id === 'CREATOR' ? 'CREATOR' : 'PRO';

        return (
          <Button
            className="w-full rounded-xl font-black"
            variant={currentTier === upgradeTier ? 'secondary' : 'default'}
            disabled={currentTier === upgradeTier}
            isLoading={isLoading === upgradeTier}
            onClick={() => handleUpgrade(upgradeTier)}
          >
            {currentTier === upgradeTier ? 'Plan Saat Ini' : `Upgrade ke ${tier.name}`}
          </Button>
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24 md:px-8 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="mt-1 rounded-full border border-border/50 bg-muted/20"
            >
              <Link to="/dashboard/settings">
                <ArrowLeft size={18} />
              </Link>
            </Button>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-primary">
                <Crown size={15} />
                Pricing
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">Paket Produksi</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground md:text-base">
                  Upgrade sesuai kebutuhan produksi video, export, dan streaming kamu.
                </p>
              </div>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full rounded-xl md:w-auto">
            <Link to="/dashboard/history">
              <Download size={16} className="mr-2" />
              Lihat Export
            </Link>
          </Button>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'success' && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm font-bold text-emerald-400">
            Pembayaran berhasil. Subscription kamu sudah di-upgrade.
          </div>
        )}
        {paymentStatus === 'failed' && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-center text-sm font-bold text-rose-400">
            Pembayaran gagal atau dibatalkan. Silakan coba lagi.
          </div>
        )}
        {successMessage && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm font-bold text-emerald-400">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-center text-sm font-bold text-rose-400">
            {error}
          </div>
        )}

        <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/70">
          <CardBody className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                {isUnlimited ? <Crown size={22} /> : <Video size={22} />}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight">
                    Plan aktif: {currentPlanLabel}
                  </h2>
                  <Badge className="rounded-full border-primary/20 bg-primary/10 text-primary">
                    {isUnlimited ? 'Unlimited' : `${remainingExports} export tersisa`}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {isUnlimited
                    ? 'Akses admin atau plan unlimited tidak memakai progress quota export.'
                    : `${exportsUsed} dari ${exportsLimit} export terpakai bulan ini.`}
                </p>
                {!isUnlimited && (
                  <div className="max-w-xl space-y-2 pt-1">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                      <span>Usage</span>
                      <span>{usagePercent}%</span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                  </div>
                )}
              </div>
            </div>

            {!isUnlimited && currentTier !== 'PRO' && (
              <Button asChild className="h-12 rounded-xl font-black">
                <a href="#plans">Upgrade Plan</a>
              </Button>
            )}
          </CardBody>
        </Card>

        {/* Pricing Cards */}
        <div id="plans" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'relative flex h-full flex-col overflow-hidden rounded-2xl border-border/50 bg-card/70 transition-colors hover:border-primary/30',
                  tier.popular && 'border-primary/40 bg-primary/4.5',
                  !isAdmin && currentTier === tier.id && 'ring-1 ring-primary/60',
                )}
              >
                {tier.popular && (
                  <div className="absolute right-4 top-4">
                    <Badge className="rounded-full bg-primary text-primary-foreground">
                      Rekomendasi
                    </Badge>
                  </div>
                )}
                {!isAdmin && currentTier === tier.id && (
                  <Badge variant="secondary" className="absolute left-4 top-4 rounded-full">
                    Plan saat ini
                  </Badge>
                )}
                <CardBody className="flex h-full flex-col p-5 md:p-6">
                  <div className="mb-5 flex items-start justify-between gap-4 pt-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 bg-muted/20 text-primary">
                      {tier.icon}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight">{tier.name}</h2>
                    <p className="text-sm font-medium text-muted-foreground">{tier.description}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {tier.bestFor}
                    </p>
                  </div>

                  <div className="my-6">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black tracking-tight">
                        {tier.price === 0 ? 'Gratis' : formatPrice(tier.price)}
                      </span>
                      <span className="pb-1 text-sm font-bold text-muted-foreground">
                        {tier.period}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 h-px bg-border/60" />

                  <ul className="mb-7 flex-1 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                          <Check size={13} />
                        </span>
                        <span className="text-sm font-medium text-foreground/90">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {renderTierAction(tier)}
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <div className="grid gap-4 md:grid-cols-3 pb-5">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            <h3 className="font-black">Upgrade instan</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Setelah pembayaran berhasil, plan aktif otomatis diperbarui.
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            <h3 className="font-black">Pembayaran lokal</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              QRIS, e-wallet, dan transfer bank diproses lewat invoice pembayaran.
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            <h3 className="font-black">Streaming terpisah</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Menit Live Streaming bisa ditambah lewat Top Up Quota.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
