
import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Card, CardBody, Chip } from '@heroui/react';
import { CreditCard, CheckCircle, Zap } from 'lucide-react';
import { authFetch } from '@/services/api';
import toast from 'react-hot-toast';

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

export function TopupModal({ isOpen, onClose }: TopupModalProps) {
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      const res = await authFetch('/api/v1/billing/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat paket');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    try {
      const res = await authFetch('/api/v1/billing/topup', {
        method: 'POST',
        body: JSON.stringify({ packageId: selectedPackage }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Redirect to Xendit Invoice
        window.location.href = data.data.invoiceUrl;
      } else {
        toast.error(data.error || 'Gagal memproses pembayaran');
      }
    } catch (e) {
      console.error(e);
      toast.error('Terjadi kesalahan');
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-xl">
                 <Zap className="text-warning" /> Top Up Kuota Streaming
              </span>
              <p className="text-sm text-foreground/60 font-normal">
                Pilih paket tambahan durasi streaming sesuai kebutuhan Anda.
              </p>
            </ModalHeader>
            <ModalBody>
               {loading ? (
                 <div className="h-40 flex items-center justify-center">
                    <span className="loading loading-spinner text-primary">Loading...</span>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.map((pkg) => (
                      <Card 
                        key={pkg.id} 
                        isPressable 
                        onPress={() => setSelectedPackage(pkg.id)}
                        className={`border-2 transition-all ${
                          selectedPackage === pkg.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-transparent hover:border-primary/50'
                        }`}
                      >
                        <CardBody className="flex flex-col gap-2 p-4">
                           <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-lg">{pkg.name}</h4>
                                <p className="text-sm text-foreground/60">
                                  {pkg.minutes >= 60 
                                    ? `${pkg.minutes / 60} Jam Streaming` 
                                    : `${pkg.minutes} Menit Streaming`
                                  }
                                </p>
                              </div>
                              {selectedPackage === pkg.id && (
                                <CheckCircle className="text-primary" size={20} />
                              )}
                           </div>
                           <div className="mt-2">
                              <Chip size="sm" color="success" variant="flat">
                                 {formatPrice(pkg.price)}
                              </Chip>
                           </div>
                        </CardBody>
                      </Card>
                    ))}
                 </div>
               )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Batal
              </Button>
              <Button 
                color="primary" 
                onPress={handlePurchase} 
                isLoading={purchasing}
                isDisabled={!selectedPackage}
                startContent={!purchasing && <CreditCard size={18} />}
              >
                Bayar Sekarang
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
