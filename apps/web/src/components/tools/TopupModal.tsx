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
  Spinner,
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

export function TopupModal({ isOpen, onClose }: Readonly<TopupModalProps>) {
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedPlan = packages.find((pkg) => pkg.id === selectedPackage);

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
      <DialogContent className="max-w-2xl rounded-3xl border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Zap size={20} />
            </span>
            <span>Top Up Kuota Streaming</span>
          </DialogTitle>
          <p className="text-sm font-medium text-muted-foreground">
            Kuota masuk otomatis setelah pembayaran berhasil.
          </p>
        </DialogHeader>

        {/* Inline Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-destructive">
            <AlertCircle size={18} />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedPackage === pkg.id}
                className={`cursor-pointer rounded-2xl border transition-all ${
                  selectedPackage === pkg.id
                    ? 'border-primary/70 bg-primary/6.5'
                    : 'border-border/50 bg-muted/10 hover:border-primary/40'
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedPackage(pkg.id);
                  }
                }}
              >
                <CardBody className="flex h-full flex-col gap-4 p-4">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-black">{pkg.name}</h4>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        {formatMinutes(pkg.minutes)}
                      </p>
                    </div>
                    {selectedPackage === pkg.id && (
                      <CheckCircle className="text-primary" size={20} />
                    )}
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Harga
                      </p>
                      <p className="mt-1 text-lg font-black">{formatPrice(pkg.price)}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-muted/40 text-[10px] uppercase tracking-widest"
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

        <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Pilihan
              </p>
              <p className="mt-1 text-sm font-black">
                {selectedPlan
                  ? `${selectedPlan.name} - ${formatPrice(selectedPlan.price)}`
                  : 'Pilih paket untuk lanjut pembayaran'}
              </p>
            </div>
            {selectedPlan && (
              <Badge className="w-fit rounded-full bg-primary/10 text-primary">
                {formatMinutes(selectedPlan.minutes)}
              </Badge>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            className="rounded-xl font-black"
            onClick={handlePurchase}
            isLoading={purchasing}
            disabled={!selectedPackage}
          >
            {!purchasing && <CreditCard size={18} />}
            Bayar Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
