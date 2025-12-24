import { Card, CardBody, CardHeader, Switch, Divider, Button, Chip, Avatar } from '@heroui/react';
import { User, Bell, Palette, Shield, CreditCard, Settings, Crown, Sparkles, Zap, ChevronRight, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/PageTransition';

export function SettingsPage() {
  const { user, subscription } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  // Get tier info
  const tierName = user?.role === 'ADMIN' ? 'Admin' : subscription?.tier === 'PRO' ? 'Pro' : subscription?.tier === 'CREATOR' ? 'Creator' : 'Free';
  const tierColor = user?.role === 'ADMIN' ? 'warning' : subscription?.tier === 'PRO' ? 'warning' : subscription?.tier === 'CREATOR' ? 'primary' : 'default';
  const TierIcon = subscription?.tier === 'PRO' || user?.role === 'ADMIN' ? Crown : subscription?.tier === 'CREATOR' ? Sparkles : Zap;

  return (
    <PageTransition className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-foreground/60">Kelola akun dan preferensi</p>
        </div>
      </div>

      <StaggerContainer className="space-y-4">
        {/* Profile Section */}
        <StaggerItem>
          <Card className="border-2 border-transparent hover:border-primary/30 transition-colors">
            <CardHeader className="flex gap-3">
              <User size={20} className="text-primary" />
              <div className="flex flex-col">
                <p className="text-md font-semibold">Profil</p>
                <p className="text-small text-foreground/60">Informasi akun kamu</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              {/* Avatar and basic info */}
              <div className="flex items-center gap-4">
                <Avatar 
                  src={user?.avatarUrl ?? undefined}
                  name={user?.name}
                  size="lg"
                  className="w-16 h-16 text-large"
                  showFallback
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg">{user?.name ?? '-'}</p>
                  <p className="text-sm text-foreground/60">{user?.email ?? '-'}</p>
                </div>
                <Button size="sm" variant="flat" endContent={<ChevronRight size={14} />}>
                  Edit Profil
                </Button>
              </div>
            </CardBody>
          </Card>
        </StaggerItem>

        {/* Appearance Section */}
        <StaggerItem>
          <Card className="border-2 border-transparent hover:border-primary/30 transition-colors">
            <CardHeader className="flex gap-3">
              <Palette size={20} className="text-primary" />
              <div className="flex flex-col">
                <p className="text-md font-semibold">Tampilan</p>
                <p className="text-small text-foreground/60">Kustomisasi tampilan aplikasi</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon size={20} className="text-foreground/60" />
                  ) : (
                    <Sun size={20} className="text-warning" />
                  )}
                  <div>
                    <p className="font-medium">Mode Gelap</p>
                    <p className="text-sm text-foreground/60">
                      {theme === 'dark' ? 'Aktif' : 'Tidak aktif'}
                    </p>
                  </div>
                </div>
                <Switch 
                  isSelected={theme === 'dark'}
                  onValueChange={toggleTheme}
                  color="primary"
                />
              </div>
            </CardBody>
          </Card>
        </StaggerItem>

        {/* Notifications Section */}
        <StaggerItem>
          <Card className="border-2 border-transparent hover:border-primary/30 transition-colors">
            <CardHeader className="flex gap-3">
              <Bell size={20} className="text-primary" />
              <div className="flex flex-col">
                <p className="text-md font-semibold">Notifikasi</p>
                <p className="text-small text-foreground/60">Kelola preferensi notifikasi</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Notifikasi Email</p>
                  <p className="text-sm text-foreground/60">Terima update via email</p>
                </div>
                <Switch defaultSelected color="primary" />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Export Selesai</p>
                  <p className="text-sm text-foreground/60">Notifikasi saat export selesai</p>
                </div>
                <Switch defaultSelected color="primary" />
              </div>
            </CardBody>
          </Card>
        </StaggerItem>

        {/* Subscription Section */}
        <StaggerItem>
          <Card className="border-2 border-transparent hover:border-primary/30 transition-colors bg-gradient-to-r from-primary-500/5 to-secondary-500/5">
            <CardHeader className="flex gap-3">
              <CreditCard size={20} className="text-primary" />
              <div className="flex flex-col">
                <p className="text-md font-semibold">Langganan</p>
                <p className="text-small text-foreground/60">Kelola paket langganan</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${tierColor}/20 flex items-center justify-center`}>
                    <TierIcon size={20} className={`text-${tierColor}`} />
                  </div>
                  <div>
                    <p className="font-medium">Paket Saat Ini</p>
                    <div className="flex items-center gap-2">
                      <Chip size="sm" color={tierColor as 'default' | 'primary' | 'warning'} variant="flat">
                        {tierName}
                      </Chip>
                      {subscription?.tier !== 'PRO' && user?.role !== 'ADMIN' && (
                        <span className="text-xs text-foreground/50">
                          {subscription?.exportsUsed ?? 0} / {subscription?.exportsLimit ?? 5} exports
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {subscription?.tier !== 'PRO' && user?.role !== 'ADMIN' && (
                  <Button 
                    as={Link}
                    to="/dashboard/pricing"
                    size="sm" 
                    color="primary"
                    endContent={<Crown size={14} />}
                  >
                    Upgrade
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </StaggerItem>

        {/* Security Section */}
        <StaggerItem>
          <Card className="border-2 border-transparent hover:border-primary/30 transition-colors">
            <CardHeader className="flex gap-3">
              <Shield size={20} className="text-primary" />
              <div className="flex flex-col">
                <p className="text-md font-semibold">Keamanan</p>
                <p className="text-small text-foreground/60">Kelola pengaturan keamanan</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Ubah Password</p>
                  <p className="text-sm text-foreground/60">Update password akun</p>
                </div>
                <Button size="sm" variant="flat" endContent={<ChevronRight size={14} />}>
                  Ubah
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Sesi Aktif</p>
                  <p className="text-sm text-foreground/60">Kelola perangkat yang login</p>
                </div>
                <Button size="sm" variant="flat" endContent={<ChevronRight size={14} />}>
                  Lihat
                </Button>
              </div>
            </CardBody>
          </Card>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
