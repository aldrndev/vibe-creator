import { AlertCircle, CheckCircle, CreditCard, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { authFetch } from '@/services/api';

interface TopupPackage {
  id: string;
  name: string;
  minutes: number;
  price: number;
}

interface TopupModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const topupPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  minutes: z.number(),
  price: z.number(),
});

const topupPackagesResponseSchema = z.object({
  data: z.array(topupPackageSchema),
});

const topupPurchaseResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      invoiceUrl: z.url(),
    })
    .optional(),
  error: z.union([z.string(), z.object({ message: z.string().optional() })]).optional(),
});

function getTopupErrorMessage(payload: unknown, fallback: string): string {
  const parsed = topupPurchaseResponseSchema.safeParse(payload);
  if (!parsed.success) return fallback;

  const { error } = parsed.data;
  if (typeof error === 'string') return error;
  return error?.message || fallback;
}

const SkeletonLoader = () => (
  <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
    {[1, 2, 3, 4].map((id) => (
      <div
        key={id}
        className="h-34 rounded-2xl border border-border/40 bg-muted/5 animate-pulse p-4.5 flex flex-col justify-between"
      >
        <div className="space-y-2">
          <div className="h-5 w-2/3 bg-muted/20 rounded-md" />
          <div className="h-4 w-1/2 bg-muted/15 rounded-md" />
        </div>
        <div className="flex justify-between items-end">
          <div className="space-y-1.5 w-1/3">
            <div className="h-3 w-1/2 bg-muted/10 rounded-md" />
            <div className="h-5 w-full bg-muted/20 rounded-md" />
          </div>
          <div className="h-6 w-1/4 bg-muted/15 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

export function TopupModal({ isOpen, onClose }: Readonly<TopupModalProps>) {
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedPlan = packages.find((pkg) => pkg.id === selectedPackage);

  const bestValuePackageId =
    packages.length > 0
      ? packages.reduce((best, current) => {
          const currentRate = current.price / current.minutes;
          const bestRate = best.price / best.minutes;
          return currentRate < bestRate ? current : best;
        }).id
      : null;

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/v1/billing/packages');
      if (res.ok) {
        const data = topupPackagesResponseSchema.parse(await res.json());
        setPackages(data.data);
      } else {
        const payload = await res.json().catch(() => null);
        setError(getTopupErrorMessage(payload, 'Gagal memuat paket'));
      }
    } catch {
      setError('Gagal memuat paket');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedPackage(null);
      fetchPackages();
      setError(null);
    }
  }, [isOpen, fetchPackages]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setError(null);
    setPurchasing(true);
    try {
      const res = await authFetch('/api/v1/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedPackage }),
      });

      const payload = await res.json().catch(() => null);
      const data = topupPurchaseResponseSchema.safeParse(payload);

      if (res.ok && data.success && data.data.success) {
        if (!data.data.data?.invoiceUrl) {
          setError('Tautan invoice tidak tersedia');
          return;
        }

        globalThis.location.href = data.data.data.invoiceUrl;
      } else {
        setError(getTopupErrorMessage(payload, 'Gagal memproses pembayaran'));
      }
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatMinutes = (minutes: number) => {
    if (minutes >= 1440) return `${minutes / 1440} hari streaming`;
    if (minutes >= 60) return `${minutes / 60} jam streaming`;
    return `${minutes} menit streaming`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl rounded-2xl border-border bg-card p-5 md:p-8">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="flex items-start sm:items-center gap-3 text-lg sm:text-xl font-bold tracking-tight text-foreground">
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Zap size={18} className="fill-current sm:size-5" />
            </span>
            <div>
              <span>Top Up Kuota Streaming</span>
              <p className="text-[11px] sm:text-xs font-normal text-muted-foreground mt-0.5 normal-case tracking-normal">
                Dapatkan kuota tambahan instan untuk livestream tanpa interupsi
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Inline Error */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-rose-500 animate-in fade-in duration-300">
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {loading ? (
          <SkeletonLoader />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-h-[280px] sm:max-h-[320px] overflow-y-auto pr-1">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedPackage === pkg.id}
                className={`group cursor-pointer rounded-xl border transition-colors duration-200 relative ${
                  selectedPackage === pkg.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 bg-muted/5 hover:border-primary/20 hover:bg-muted/10'
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedPackage(pkg.id);
                  }
                }}
              >
                <CardBody className="flex h-full flex-col gap-2.5 sm:gap-3 p-3.5 sm:p-4">
                  {pkg.id === bestValuePackageId && (
                    <div className="flex">
                      <Badge className="rounded border-transparent bg-primary/10 hover:bg-primary/10 px-1.5 py-0.2 text-[7px] sm:text-[7px] font-bold uppercase tracking-wider text-primary">
                        Paling Hemat
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm sm:text-base font-bold tracking-tight text-foreground">
                        {pkg.name}
                      </h4>
                      <p className="mt-0.5 text-[11px] sm:text-xs font-semibold text-muted-foreground/80">
                        {formatMinutes(pkg.minutes)}
                      </p>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <CheckCircle
                        className={
                          selectedPackage === pkg.id
                            ? 'text-primary fill-primary/10'
                            : 'text-muted-foreground/20'
                        }
                        size={16}
                      />
                    </div>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                    <div>
                      <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-muted-foreground/75">
                        Harga
                      </p>
                      <p className="mt-0.5 text-base sm:text-lg font-bold text-foreground">
                        {formatPrice(pkg.price)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="rounded-md bg-secondary text-[8px] sm:text-[9px] font-semibold tracking-wider px-2 py-0.5 border-transparent"
                    >
                      Rp {Math.round(pkg.price / Math.max(pkg.minutes, 1)).toLocaleString('id-ID')}
                      /min
                    </Badge>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        <div
          className={`rounded-xl border transition-colors duration-200 p-3.5 sm:p-4 ${
            selectedPlan ? 'border-primary/20 bg-primary/5' : 'border-border/50 bg-muted/5'
          }`}
        >
          {selectedPlan ? (
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-primary">
                    Ringkasan Pembelian
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-foreground mt-0.5">
                    {selectedPlan.name}
                  </h4>
                </div>
                <Badge className="rounded-md bg-primary/10 text-primary border-transparent font-semibold text-[10px] sm:text-xs shrink-0">
                  +{formatMinutes(selectedPlan.minutes)}
                </Badge>
              </div>
              <div className="border-t border-primary/10 pt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Pembayaran</span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {formatPrice(selectedPlan.price)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-3 text-muted-foreground">
              <AlertCircle size={16} className="text-muted-foreground/60 shrink-0" />
              <p className="text-[11px] sm:text-xs font-medium">
                Silakan pilih salah satu paket kuota streaming di atas untuk melanjutkan ke metode
                pembayaran.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-3 flex-col-reverse sm:flex-row">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-10 sm:h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm text-muted-foreground"
          >
            Batal
          </Button>
          <Button
            className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200"
            onClick={handlePurchase}
            isLoading={purchasing}
            disabled={!selectedPackage}
          >
            {!purchasing && <CreditCard size={14} className="mr-1.5 sm:size-4 sm:mr-2" />}
            Bayar Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
