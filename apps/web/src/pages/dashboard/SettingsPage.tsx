import {
  ArrowRight,
  Bell,
  Camera,
  Check,
  CreditCard,
  Lock,
  Mail,
  Moon,
  Palette,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';

type ThemeMode = 'light' | 'dark';
type NotificationKey = 'email' | 'push' | 'marketing';
type NotificationSetting = {
  id: NotificationKey;
  label: string;
  desc: string;
  icon: typeof Bell;
};

const notificationSettings: NotificationSetting[] = [
  {
    id: 'email',
    label: 'Laporan Email',
    desc: 'Detail progress render dan transaksi.',
    icon: Mail,
  },
  {
    id: 'push',
    label: 'Push Browser',
    desc: 'Notifikasi instan saat video siap.',
    icon: Zap,
  },
  {
    id: 'marketing',
    label: 'Update Produk',
    desc: 'Fitur baru dan promo eksklusif.',
    icon: Sparkles,
  },
];

export function SettingsPage() {
  const { user, subscription } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('general');

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false,
  });

  // Get tier info
  const tierName =
    user?.role === 'ADMIN'
      ? 'Admin'
      : subscription?.tier === 'PRO'
        ? 'Pro'
        : subscription?.tier === 'CREATOR'
          ? 'Creator'
          : 'Free';

  return (
    <div className="pb-24 lg:pb-12">
      <div className="max-w-[1400px] mx-auto space-y-8 md:space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
          <div className="space-y-1 md:space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Pengaturan
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Kelola preferensi akun, paket, dan konfigurasi workspace kamu.
            </p>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400/20 via-amber-500/20 to-orange-400/20 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
            <div className="relative h-11 p-6 md:px-5 rounded-xl bg-background border border-orange-500/20 flex items-center gap-3.5 shadow-sm">
              <div className="size-8 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center border border-orange-500/10">
                <Zap className="size-4 text-orange-500 fill-orange-500/20" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Paket Aktif
                </span>
                <span className="text-sm font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent leading-none mt-0.5">
                  {tierName}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 md:space-y-10">
          {/* Tabs List */}
          <div className="w-full overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            <TabsList className="h-auto bg-muted border border-border rounded-2xl w-full sm:w-fit inline-flex p-0">
              {[
                { id: 'general', icon: Settings, label: 'Umum' },
                { id: 'account', icon: User, label: 'Akun' },
                { id: 'billing', icon: CreditCard, label: 'Billing' },
                { id: 'notifications', icon: Bell, label: 'Notifikasi' },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-xl gap-2 h-10 md:h-10 px-auto md:px-6 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] md:text-xs uppercase tracking-widest flex-1 sm:flex-none whitespace-nowrap"
                >
                  <tab.icon size={16} className="md:size-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6 md:space-y-10">
              <TabsContent
                value="general"
                className="mt-0 space-y-6 md:space-y-8 outline-none border-none"
              >
                <Card className="bg-card border-border shadow-none rounded-xl">
                  <CardHeader className="p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Palette className="size-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base md:text-lg font-bold">
                          Kustomisasi Tema
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          Sesuaikan tampilan antarmuka aplikasi.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="p-6">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {[
                        {
                          id: 'light',
                          label: 'Mode Terang',
                          icon: Sun,
                          color: 'bg-white text-black',
                        },
                        {
                          id: 'dark',
                          label: 'Mode Gelap',
                          icon: Moon,
                          color: 'bg-slate-950 text-white',
                        },
                      ].map((mode) => (
                        <button
                          type="button"
                          key={mode.id}
                          onClick={() => setTheme(mode.id as ThemeMode)}
                          className={cn(
                            'relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300',
                            theme === mode.id
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:bg-muted/50',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                mode.id === 'light'
                                  ? 'text-orange-500 bg-orange-500/10'
                                  : 'text-blue-500 bg-blue-500/10',
                              )}
                            >
                              <mode.icon className="size-5" />
                            </div>
                            <span className="font-medium text-sm">{mode.label}</span>
                          </div>
                          {theme === mode.id && (
                            <div className="absolute top-3 right-3 text-primary">
                              <Check size={16} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </TabsContent>

              <TabsContent
                value="account"
                className="mt-0 space-y-6 md:space-y-8 outline-none border-none"
              >
                <Card className="bg-card border-border shadow-none rounded-xl">
                  <CardHeader className="p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                      <User className="size-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base md:text-lg font-bold">
                          Profil Publik
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          Informasi dasar akun dan akses kamu.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="p-6 space-y-8">
                    <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8">
                      <div className="relative group cursor-pointer">
                        <Avatar
                          src={user?.avatarUrl || undefined}
                          name={user?.name || 'U'}
                          className="w-24 h-24 border-2 border-border"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <Camera className="size-5 md:size-6 text-white" />
                        </div>
                      </div>
                      <div className="text-center sm:text-left space-y-2 md:space-y-3">
                        <h3 className="text-2xl md:text-3xl font-black leading-tight">
                          {user?.name}
                        </h3>
                        <p className="text-muted-foreground text-xs md:text-sm font-medium">
                          {user?.email}
                        </p>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                          <Badge
                            variant="outline"
                            className="font-bold border-primary/20 text-primary bg-primary/5 uppercase tracking-widest text-[9px] md:text-[10px]"
                          >
                            {user?.role || 'USER'} ACCESS
                          </Badge>
                          <Badge
                            variant="outline"
                            className="font-bold border-border text-muted-foreground bg-muted/50 uppercase tracking-widest text-[9px] md:text-[10px]"
                          >
                            ID: {user?.id?.slice(0, 8)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 pt-2">
                      <div className="space-y-2">
                        <div className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                          Nama Lengkap
                        </div>
                        <Input
                          defaultValue={user?.name}
                          className="h-11 md:h-12 rounded-xl bg-background border-input focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                          Alamat Email
                        </div>
                        <Input
                          defaultValue={user?.email}
                          disabled
                          className="h-11 md:h-12 rounded-xl bg-muted border-input text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border">
                      <Button className="w-full sm:w-auto px-10 h-11 md:h-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:shadow-lg hover:shadow-primary/20 transition-all">
                        Simpan Profil
                      </Button>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-card border-border shadow-none rounded-xl mt-6">
                  <CardBody className="p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <Lock className="size-5 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="font-bold text-sm">Kredensial & Keamanan</p>
                        <p className="text-xs text-muted-foreground">
                          Kelola password dan privasi akun.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto h-10 md:h-11 rounded-xl px-6 border-border font-bold text-[10px] md:text-xs uppercase tracking-widest"
                    >
                      Ubah Password
                    </Button>
                  </CardBody>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="mt-0 outline-none border-none" key="billing">
                <Card className="bg-card border-border shadow-none rounded-xl">
                  <CardHeader className="p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                      <CreditCard className="size-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base md:text-lg font-bold">
                          Langganan & Billing
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          Kelola paket aktif, metode pembayaran, dan riwayat tagihan.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="p-6 space-y-8">
                    {/* Current Plan Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                      <div className="space-y-4 relative z-10">
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Paket Saat Ini
                          </p>
                          <div className="flex items-center gap-3">
                            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                              {tierName} <span className="text-primary">Plan</span>
                            </h3>
                            <Badge
                              variant="outline"
                              className={cn(
                                'h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest border-primary/20 bg-primary/5 text-primary',
                                subscription?.status === 'ACTIVE'
                                  ? 'border-green-500/20 bg-green-500/5 text-green-500'
                                  : 'border-red-500/20 bg-red-500/5 text-red-500',
                              )}
                            >
                              {subscription?.status || 'ACTIVE'}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-foreground">
                            {subscription?.tier === 'FREE'
                              ? 'Rp 0'
                              : subscription?.tier === 'CREATOR'
                                ? 'Rp 199.000'
                                : 'Rp 499.000'}
                            <span className="text-sm font-medium text-muted-foreground ml-1">
                              / bulan
                            </span>
                          </p>
                          {subscription?.validUntil && (
                            <p className="text-xs text-muted-foreground font-medium">
                              Diperbarui pada{' '}
                              {new Date(subscription.validUntil).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 w-full md:w-auto relative z-10">
                        <Button className="h-11 md:h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs bg-primary hover:shadow-lg hover:shadow-primary/20 transition-all">
                          {subscription?.tier === 'FREE' ? 'Upgrade Plan' : 'Kelola Langganan'}
                        </Button>
                        {subscription?.tier !== 'FREE' && (
                          <Button
                            variant="outline"
                            className="h-11 md:h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs border-border"
                          >
                            Download Invoice
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4 p-5 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Zap size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">Kuota Export</p>
                            <p className="text-xs text-muted-foreground">
                              Batas video generate per bulan
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span>
                              {subscription?.exportsUsed || 0} / {subscription?.exportsLimit || 5}{' '}
                              Video
                            </span>
                            <span className="text-primary">
                              {Math.min(
                                ((subscription?.exportsUsed || 0) /
                                  (subscription?.exportsLimit || 1)) *
                                  100,
                                100,
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-background rounded-full overflow-hidden border border-border/50">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(
                                  ((subscription?.exportsUsed || 0) /
                                    (subscription?.exportsLimit || 1)) *
                                    100,
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-5 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">Metode Pembayaran</p>
                            <p className="text-xs text-muted-foreground">Kartu kredit utama</p>
                          </div>
                        </div>
                        {subscription?.tier === 'FREE' ? (
                          <div className="flex flex-col h-full justify-center space-y-2">
                            <p className="text-xs text-muted-foreground italic">
                              Belum ada metode pembayaran.
                            </p>
                            <Button
                              variant="link"
                              className="w-fit h-auto p-0 text-xs font-bold text-primary"
                            >
                              + Tambah Kartu
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-6 bg-slate-800 rounded flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white tracking-widest">
                                  VISA
                                </span>
                              </div>
                              <span className="text-sm font-bold tracking-tight">•••• 4242</span>
                            </div>
                            <Button
                              variant="ghost"
                              className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                            >
                              Ubah
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Portal Link */}
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="link"
                        className="text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-2"
                      >
                        Buka Customer Portal <ArrowRight size={14} />
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </TabsContent>

              <TabsContent
                value="notifications"
                className="mt-0 space-y-6 md:space-y-8 outline-none border-none"
                key="notifications"
              >
                <Card className="bg-card border-border shadow-none rounded-xl">
                  <CardHeader className="p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Bell className="size-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base md:text-lg font-bold">
                          Pusat Notifikasi
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          Kontrol bagaimana kami mengirimkan update.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="p-0 divide-y divide-border">
                    {notificationSettings.map((notif) => (
                      <div
                        key={notif.id}
                        className="flex items-center justify-between p-4 md:p-6 gap-4"
                      >
                        <div className="flex items-center gap-4 md:gap-5">
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/[0.02] flex items-center justify-center text-muted-foreground shrink-0">
                            <notif.icon className="size-4 md:size-4.5" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-xs md:text-sm tracking-tight">
                              {notif.label}
                            </p>
                            <p className="text-[10px] md:text-xs text-muted-foreground font-medium line-clamp-1">
                              {notif.desc}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={notifications[notif.id]}
                          onCheckedChange={(c) =>
                            setNotifications((prev) => ({
                              ...prev,
                              [notif.id]: c,
                            }))
                          }
                          className="data-[state=checked]:bg-primary h-6 md:h-7 w-11 md:w-12 shrink-0"
                        />
                      </div>
                    ))}
                  </CardBody>
                </Card>
              </TabsContent>
            </div>

            {/* Sidebar Support Area */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-card border-border shadow-none rounded-xl">
                <CardBody className="p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="size-4 text-primary" />
                    <h4 className="text-xs font-bold uppercase tracking-widest">
                      Ringkasan Keamanan
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Sesi Login</span>
                      <Badge variant="secondary" className="text-[10px] px-2 font-bold">
                        Aktif
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        ID Verifikasi
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-2 font-bold">
                        Verified
                      </Badge>
                    </div>
                  </div>
                  <div className="h-px w-full bg-border" />
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed italic border-l-2 border-primary/30 pl-3">
                    Gunakan autentikasi dua faktor (2FA) untuk memberikan proteksi ekstra.
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default SettingsPage;
