import { useState } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardBody, CardHeader, Button, Chip, Divider } from '@heroui/react';
import { Check, Sparkles, Crown, Zap, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { authFetch } from '@/services/api';
import toast from 'react-hot-toast';

interface PricingTier {
  id: 'FREE' | 'CREATOR' | 'PRO';
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    period: 'selamanya',
    description: 'Untuk memulai kreasi video',
    features: [
      '5 export per bulan',
      'Resolusi 720p',
      'Watermark',
      'Fitur dasar editor',
      'Prompt builder',
    ],
    icon: <Zap size={24} />,
    color: 'default',
  },
  {
    id: 'CREATOR',
    name: 'Creator',
    price: 99000,
    period: '/bulan',
    description: 'Untuk content creator aktif',
    features: [
      '50 export per bulan',
      'Resolusi 1080p Full HD',
      'Tanpa watermark',
      'Loop & Reaction tools',
      'Priority support',
    ],
    icon: <Sparkles size={24} />,
    color: 'primary',
    popular: true,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 199000,
    period: '/bulan',
    description: 'Untuk profesional & studio',
    features: [
      'Unlimited export',
      'Resolusi hingga 4K',
      'Tanpa watermark',
      'Semua tools premium',
      'Priority export',
      'Live streaming',
    ],
    icon: <Crown size={24} />,
    color: 'warning',
  },
];

export function PricingPage() {
  const [searchParams] = useSearchParams();
  const { subscription } = useAuthStore();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  
  const paymentStatus = searchParams.get('payment');
  const currentTier = subscription?.tier || 'FREE';

  const handleUpgrade = async (tier: 'CREATOR' | 'PRO') => {
    try {
      setIsLoading(tier);
      
      const response = await authFetch('/api/v1/payment/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }
      
      const data = await response.json();
      
      // Check if mock mode (development)
      if (data.data.invoiceUrl.startsWith('/payment/mock')) {
        // Confirm mock payment
        await authFetch('/api/v1/payment/mock-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: data.data.paymentId }),
        });
        
        toast.success('Development mode: Payment simulated successfully!');
        window.location.reload();
      } else {
        // Redirect to Xendit payment page
        window.location.href = data.data.invoiceUrl;
      }
    } catch (err) {
      logger.error('Upgrade failed', err);
      toast.error('Gagal memproses pembayaran');
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard/settings">
            <Button isIconOnly variant="light" size="sm">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pricing</h1>
            <p className="text-foreground/60">Pilih paket yang sesuai kebutuhanmu</p>
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'success' && (
          <div className="mb-6 p-4 rounded-xl bg-success/20 text-success text-center">
            🎉 Pembayaran berhasil! Subscription kamu telah diupgrade.
          </div>
        )}
        {paymentStatus === 'failed' && (
          <div className="mb-6 p-4 rounded-xl bg-danger/20 text-danger text-center">
            ❌ Pembayaran gagal atau dibatalkan. Silakan coba lagi.
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`relative h-full ${tier.popular ? 'border-2 border-primary shadow-lg' : ''} ${currentTier === tier.id ? 'ring-2 ring-success' : ''}`}
              >
                {tier.popular && (
                  <Chip 
                    color="primary" 
                    size="sm" 
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    Populer
                  </Chip>
                )}
                {currentTier === tier.id && (
                  <Chip 
                    color="success" 
                    size="sm" 
                    className="absolute -top-3 right-4"
                  >
                    Current
                  </Chip>
                )}
                <CardHeader className="flex flex-col items-center pt-8 pb-4">
                  <div className={`p-3 rounded-full bg-${tier.color}/20 text-${tier.color} mb-3`}>
                    {tier.icon}
                  </div>
                  <h2 className="text-xl font-bold">{tier.name}</h2>
                  <p className="text-sm text-foreground/60">{tier.description}</p>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="text-center mb-6">
                    <span className="text-3xl font-bold">
                      {tier.price === 0 ? 'Gratis' : formatPrice(tier.price)}
                    </span>
                    <span className="text-foreground/60">{tier.period}</span>
                  </div>

                  <Divider className="mb-6" />

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={18} className="text-success mt-0.5 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {tier.id === 'FREE' ? (
                    <Button
                      fullWidth
                      variant="flat"
                      isDisabled
                    >
                      {currentTier === 'FREE' ? 'Paket Saat Ini' : 'Downgrade'}
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      color={tier.color === 'default' ? 'primary' : tier.color}
                      variant={currentTier === tier.id ? 'flat' : 'solid'}
                      isDisabled={currentTier === tier.id}
                      isLoading={isLoading === tier.id}
                      onPress={() => handleUpgrade(tier.id as 'CREATOR' | 'PRO')}
                    >
                      {currentTier === tier.id ? 'Paket Saat Ini' : 'Upgrade'}
                    </Button>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold mb-4">Pertanyaan Umum</h3>
          <div className="max-w-2xl mx-auto space-y-4 text-sm text-foreground/60">
            <p><strong>Bagaimana cara upgrade?</strong> Klik tombol Upgrade, lakukan pembayaran via QRIS/E-Wallet/Transfer, dan subscription langsung aktif.</p>
            <p><strong>Apakah bisa downgrade?</strong> Ya, subscription akan kembali ke Free setelah periode berakhir jika tidak diperpanjang.</p>
            <p><strong>Metode pembayaran?</strong> Kami menerima QRIS, GoPay, OVO, DANA, ShopeePay, dan transfer bank.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
