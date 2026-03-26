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
  isOpen: boolean;
  onClose: () => void;
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
      invoiceUrl: z.string().url(),
    })
    .optional(),
  error: z.string().optional(),
});

export function TopupModal({ isOpen, onClose }: TopupModalProps) {
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/billing/packages');
      if (res.ok) {
        const data = topupPackagesResponseSchema.parse(await res.json());
        setPackages(data.data);
      } else {
        setError('Gagal memuat paket');
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
        body: JSON.stringify({ packageId: selectedPackage }),
      });

      const data = topupPurchaseResponseSchema.parse(await res.json());

      if (res.ok && data.success) {
        if (!data.data?.invoiceUrl) {
          setError('Tautan invoice tidak tersedia');
          return;
        }

        window.location.href = data.data.invoiceUrl;
      } else {
        setError(data.error || 'Gagal memproses pembayaran');
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="text-yellow-500" /> Top Up Kuota Streaming
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Pilih paket tambahan durasi streaming sesuai kebutuhan Anda.
          </p>
        </DialogHeader>

        {/* Inline Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedPackage === pkg.id}
                className={`cursor-pointer border-2 transition-all ${
                  selectedPackage === pkg.id
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-primary/50'
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedPackage(pkg.id);
                  }
                }}
              >
                <CardBody className="flex flex-col gap-2 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg">{pkg.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {pkg.minutes >= 60
                          ? `${pkg.minutes / 60} Jam Streaming`
                          : `${pkg.minutes} Menit Streaming`}
                      </p>
                    </div>
                    {selectedPackage === pkg.id && (
                      <CheckCircle className="text-primary" size={20} />
                    )}
                  </div>
                  <div className="mt-2">
                    <Badge variant="default">{formatPrice(pkg.price)}</Badge>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handlePurchase} isLoading={purchasing} disabled={!selectedPackage}>
            {!purchasing && <CreditCard size={18} />}
            Bayar Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
