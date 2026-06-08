import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Check,
  CreditCard,
  KeyRound,
  Lock,
  type LucideIcon,
  Mail,
  Moon,
  Palette,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Progress,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import {
  type NotificationPreferences,
  useChangePassword,
  usePaymentHistory,
  useUpdateProfile,
  useUpdateUserPreferences,
  useUserPreferences,
} from '@/hooks/use-settings';
import { useMutableSearchParams } from '@/lib/route-search';
import { cn } from '@/lib/utils';
import type { PaymentRecord } from '@/services/settings-api';
import { type User as AuthUser, useAuthStore } from '@/stores/auth-store';

type SettingsTab = 'general' | 'account' | 'billing' | 'notifications' | 'security';
type NotificationKey = keyof NotificationPreferences;

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter').max(128),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi password tidak sama',
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const notificationSettings: Array<{
  id: NotificationKey;
  label: string;
  desc: string;
  icon: LucideIcon;
}> = [
  {
    id: 'email',
    label: 'Laporan Email',
    desc: 'Progress render, status export, dan transaksi penting.',
    icon: Mail,
  },
  {
    id: 'push',
    label: 'Push Browser',
    desc: 'Notifikasi instan saat browser mengizinkan.',
    icon: Zap,
  },
  {
    id: 'marketing',
    label: 'Update Produk',
    desc: 'Fitur baru, promo, dan info produk pilihan.',
    icon: Sparkles,
  },
];

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const defaultNotifications: NotificationPreferences = {
  email: true,
  push: false,
  marketing: false,
};

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return dateTimeFormatter.format(new Date(value));
}

function getPaymentStatusLabel(status: PaymentRecord['status']): string {
  const labels: Record<PaymentRecord['status'], string> = {
    PENDING: 'Menunggu',
    PAID: 'Berhasil',
    EXPIRED: 'Expired',
    FAILED: 'Gagal',
  };
  return labels[status];
}

async function requestPushPermission(): Promise<string | null> {
  if (!('Notification' in window)) {
    return 'Push browser belum tersedia di perangkat ini.';
  }
  if (Notification.permission === 'denied') {
    return 'Izin push ditolak di browser. Ubah dari pengaturan browser.';
  }
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return 'Push browser belum aktif karena izin belum diberikan.';
    }
  }
  return null;
}

function getTierName(userRole?: string, subscriptionTier?: string) {
  if (userRole === 'ADMIN') return 'Admin';
  if (subscriptionTier === 'PRO') return 'Pro';
  if (subscriptionTier === 'CREATOR') return 'Creator';
  return 'Free';
}

function calculateUsagePercent(limit?: number, used?: number) {
  if (!limit || limit <= 0 || limit >= 999999) {
    return 0;
  }
  return Math.min(((used ?? 0) / limit) * 100, 100);
}

function PaymentHistoryList({
  paymentHistoryQuery,
}: {
  paymentHistoryQuery: {
    isLoading: boolean;
    data: PaymentRecord[] | undefined;
  };
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">Riwayat Pembayaran</h3>
        {paymentHistoryQuery.isLoading && <Spinner size="sm" />}
      </div>
      {paymentHistoryQuery.data && paymentHistoryQuery.data.length > 0 ? (
        <div className="divide-y divide-border rounded-2xl border border-border">
          {paymentHistoryQuery.data.slice(0, 5).map((payment: PaymentRecord) => (
            <div
              key={payment.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold text-foreground">
                  {payment.tier} Plan · {currencyFormatter.format(payment.amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(payment.paidAt ?? payment.createdAt)}
                </p>
              </div>
              <Badge variant="outline">{getPaymentStatusLabel(payment.status)}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted-foreground">
          Belum ada riwayat pembayaran.
        </div>
      )}
    </div>
  );
}

function NotificationSettingsList({
  notifications,
  notificationNotice,
  isLoading,
  onChange,
}: {
  notifications: NotificationPreferences;
  notificationNotice: string | null;
  isLoading: boolean;
  onChange: (key: NotificationKey, checked: boolean) => void;
}) {
  return (
    <CardBody className="divide-y divide-border p-0">
      {notificationNotice && (
        <div className="p-5">
          <StatusBanner tone="warning" icon={AlertCircle} message={notificationNotice} />
        </div>
      )}
      {notificationSettings.map((setting) => (
        <div key={setting.id} className="flex items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground">
              <setting.icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground">{setting.label}</p>
              <p className="text-sm text-muted-foreground">{setting.desc}</p>
            </div>
          </div>
          <Switch
            checked={notifications[setting.id]}
            disabled={isLoading}
            onCheckedChange={(checked) => onChange(setting.id, checked)}
          />
        </div>
      ))}
    </CardBody>
  );
}

function PaymentStatusBanner({
  status,
  navigate,
}: {
  status: string | null;
  navigate: (options: { to: string }) => void;
}) {
  if (!status) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Status pembayaran tersedia di halaman Pricing. Buka halaman paket untuk melihat detailnya.
      </span>
      <Button
        size="sm"
        className="rounded-xl"
        onClick={() => navigate({ to: '/dashboard/pricing' })}
      >
        Buka Pricing
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useMutableSearchParams();
  const { user, subscription } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);

  const preferencesQuery = useUserPreferences();
  const updatePreferencesMutation = useUpdateUserPreferences();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const paymentHistoryQuery = usePaymentHistory();

  const tierName = getTierName(user?.role, subscription?.tier);

  const notifications = preferencesQuery.data?.notifications ?? defaultNotifications;
  const handleNotificationChange = async (key: NotificationKey, checked: boolean) => {
    setNotificationNotice(null);

    if (key === 'push' && checked) {
      const errorMsg = await requestPushPermission();
      if (errorMsg) {
        setNotificationNotice(errorMsg);
        return;
      }
    }

    try {
      await updatePreferencesMutation.mutateAsync({ [key]: checked });
    } catch (error) {
      setNotificationNotice(error instanceof Error ? error.message : 'Preferensi gagal disimpan.');
    }
  };

  const exportLimitLabel =
    subscription && subscription.exportsLimit >= 999999
      ? 'Unlimited'
      : `${subscription?.exportsLimit ?? 5}`;
  const exportUsagePercent = useMemo(
    () => calculateUsagePercent(subscription?.exportsLimit, subscription?.exportsUsed),
    [subscription],
  );
  const paymentStatus = searchParams.get('payment');

  return (
    <div className="pb-6 lg:pb-14">
      <div className="mx-auto max-w-[1320px] space-y-7 px-1 md:space-y-9">
        <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-primary">
              Pengaturan
            </p>
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              Workspace & Akun
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground md:text-base">
              Kelola profil, paket, notifikasi, dan keamanan akun dari satu tempat.
            </p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <Zap className="size-4 text-primary" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Paket Aktif
              </p>
              <p className="text-sm font-black text-foreground">{tierName}</p>
            </div>
          </div>
        </header>

        <PaymentStatusBanner status={paymentStatus} navigate={navigate} />

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SettingsTab)}
          className="space-y-6"
        >
          <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="inline-flex h-auto min-w-max rounded-2xl border border-border bg-card p-1">
              {[
                { id: 'general', icon: Palette, label: 'Umum' },
                { id: 'account', icon: User, label: 'Akun' },
                { id: 'billing', icon: CreditCard, label: 'Billing' },
                { id: 'notifications', icon: Bell, label: 'Notifikasi' },
                { id: 'security', icon: ShieldCheck, label: 'Keamanan' },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <tab.icon className="mr-2 size-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="general" className="mt-0">
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="border-b border-border p-5">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Palette className="size-5 text-primary" />
                  Tema
                </CardTitle>
                <CardDescription>
                  Vibe Creator memakai mode gelap sebagai tampilan utama untuk pengalaman video yang
                  lebih fokus.
                </CardDescription>
              </CardHeader>
              <CardBody className="p-5">
                <div className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-background/60 text-primary">
                      <Moon className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-foreground">Mode gelap aktif</h3>
                      <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground">
                        Untuk fase launch, tampilan dibuat dark-only agar preview video, timeline,
                        dan workspace tetap konsisten.
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="w-fit rounded-full">
                    Default
                  </Badge>
                </div>
              </CardBody>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="mt-0 space-y-5">
            <AccountProfileCard user={user} updateProfileMutation={updateProfileMutation} />
            <ChangePasswordCard changePasswordMutation={changePasswordMutation} />
          </TabsContent>

          <TabsContent value="billing" className="mt-0 space-y-5">
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="border-b border-border p-5">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <CreditCard className="size-5 text-primary" />
                  Langganan & Billing
                </CardTitle>
                <CardDescription>
                  Data paket dan pembayaran berasal dari sistem billing.
                </CardDescription>
              </CardHeader>
              <CardBody className="space-y-6 p-5">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-border bg-background p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Paket Saat Ini
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <h3 className="text-3xl font-black text-foreground">{tierName}</h3>
                      <Badge
                        variant="outline"
                        className="border-primary/20 bg-primary/10 text-primary"
                      >
                        {subscription?.status ?? 'ACTIVE'}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Valid sampai {formatDateTime(subscription?.validUntil ?? null)}
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Button
                        className="rounded-xl"
                        onClick={() => navigate({ to: '/dashboard/pricing' })}
                      >
                        Upgrade Plan
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => navigate({ to: '/dashboard/pricing' })}
                      >
                        Kelola Langganan
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Kuota Export
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-2xl font-black text-foreground">
                          {subscription?.exportsUsed ?? 0}
                          <span className="text-sm text-muted-foreground">
                            {' '}
                            / {exportLimitLabel}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">Terpakai bulan ini</p>
                      </div>
                      {(subscription?.exportsLimit ?? 0) >= 999999 && (
                        <Badge className="bg-primary/10 text-primary">Unlimited</Badge>
                      )}
                    </div>
                    <Progress value={exportUsagePercent} className="mt-5 h-2 bg-muted" />
                  </div>
                </div>

                <PaymentHistoryList paymentHistoryQuery={paymentHistoryQuery} />
              </CardBody>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="border-b border-border p-5">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Bell className="size-5 text-primary" />
                  Preferensi Notifikasi
                </CardTitle>
                <CardDescription>
                  Preferensi disimpan di server dan ikut lintas device.
                </CardDescription>
              </CardHeader>
              <NotificationSettingsList
                notifications={notifications}
                notificationNotice={notificationNotice}
                isLoading={preferencesQuery.isLoading || updatePreferencesMutation.isPending}
                onChange={(key, checked) => void handleNotificationChange(key, checked)}
              />
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="border-b border-border p-5">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <ShieldCheck className="size-5 text-primary" />
                  Ringkasan Keamanan
                </CardTitle>
                <CardDescription>
                  Hanya menampilkan status keamanan yang benar-benar tersedia.
                </CardDescription>
              </CardHeader>
              <CardBody className="grid gap-4 p-5 md:grid-cols-3">
                <SecurityTile
                  icon={Lock}
                  title="Sesi Saat Ini"
                  status="Aktif"
                  desc="Kamu sedang masuk di perangkat ini."
                />
                <SecurityTile
                  icon={KeyRound}
                  title="Password"
                  status="Tersedia"
                  desc="Ubah password dari tab Akun."
                />
                <SecurityTile
                  icon={ShieldCheck}
                  title="2FA"
                  status="Belum tersedia"
                  desc="Belum ada sistem 2FA aktif di aplikasi."
                />
              </CardBody>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface StatusBannerProps {
  readonly tone: 'success' | 'warning' | 'danger';
  readonly icon: LucideIcon;
  readonly message: string;
}

function StatusBanner({ tone, icon: Icon, message }: StatusBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium',
        tone === 'success' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
        tone === 'warning' && 'border-amber-500/20 bg-amber-500/10 text-amber-100',
        tone === 'danger' && 'border-destructive/20 bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface SecurityTileProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly status: string;
  readonly desc: string;
}

function SecurityTile({ icon: Icon, title, status, desc }: SecurityTileProps) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Icon className="size-5 text-primary" />
        <Badge variant="secondary">{status}</Badge>
      </div>
      <p className="font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

export default SettingsPage;

function AccountProfileCard({
  user,
  updateProfileMutation,
}: {
  user: AuthUser | null;
  updateProfileMutation: ReturnType<typeof useUpdateProfile>;
}) {
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setProfileName(user?.name ?? '');
  }, [user?.name]);

  const profileDirty = profileName.trim() !== (user?.name ?? '');

  const handleProfileSave = async () => {
    setProfileError(null);
    setProfileMessage(null);
    const name = profileName.trim();

    if (!name) {
      setProfileError('Nama wajib diisi.');
      return;
    }
    if (name.length > 80) {
      setProfileError('Nama maksimal 80 karakter.');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({ name });
      setProfileMessage('Profil berhasil disimpan.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Update profil gagal.');
    }
  };

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader className="border-b border-border p-5">
        <CardTitle className="flex items-center gap-3 text-lg">
          <User className="size-5 text-primary" />
          Profil Akun
        </CardTitle>
        <CardDescription>Nama disimpan di server. Email belum bisa diubah.</CardDescription>
      </CardHeader>
      <CardBody className="space-y-6 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar
            src={user?.avatarUrl ?? undefined}
            name={user?.name ?? 'U'}
            className="h-20 w-20 border border-border"
          />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black text-foreground">{user?.name ?? 'User'}</h2>
            <p className="truncate text-sm font-medium text-muted-foreground">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-primary/20 text-primary">
                {user?.role ?? 'USER'}
              </Badge>
              <Badge variant="secondary">ID {user?.id.slice(0, 8)}</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nama"
            value={profileName}
            maxLength={80}
            error={profileError ?? undefined}
            onChange={(event) => {
              setProfileName(event.target.value);
              setProfileError(null);
              setProfileMessage(null);
            }}
          />
          <Input label="Email" value={user?.email ?? ''} disabled />
        </div>

        {profileMessage && <StatusBanner tone="success" icon={Check} message={profileMessage} />}

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Avatar upload belum tersedia. Avatar URL aman bisa ditambahkan di fase berikutnya.
          </p>
          <Button
            className="rounded-xl"
            disabled={!profileDirty}
            isLoading={updateProfileMutation.isPending}
            onClick={handleProfileSave}
          >
            Simpan Profil
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ChangePasswordCard({
  changePasswordMutation,
}: {
  changePasswordMutation: ReturnType<typeof useChangePassword>;
}) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordForm = useForm<PasswordFormValues>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handlePasswordSubmit = passwordForm.handleSubmit(async (values) => {
    setPasswordError(null);
    setPasswordMessage(null);

    const handleValidationErrors = (issues: z.ZodIssue[]) => {
      for (const issue of issues) {
        const field = issue.path[0] as keyof PasswordFormValues;
        if (field === 'currentPassword' || field === 'newPassword' || field === 'confirmPassword') {
          passwordForm.setError(field, { message: issue.message });
        }
      }
    };

    const parsed = passwordFormSchema.safeParse(values);
    if (!parsed.success) {
      handleValidationErrors(parsed.error.issues);
      return;
    }

    try {
      await changePasswordMutation.mutateAsync(parsed.data);
      passwordForm.reset();
      setPasswordMessage('Password berhasil diubah.');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Ubah password gagal.');
    }
  });

  return (
    <>
      <Card className="rounded-2xl border-border bg-card">
        <CardBody className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <KeyRound className="size-5 text-primary" />
            <div>
              <p className="font-bold text-foreground">Password</p>
              <p className="text-sm text-muted-foreground">
                Ubah password dengan verifikasi password saat ini.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setPasswordDialogOpen(true);
              setPasswordError(null);
              setPasswordMessage(null);
            }}
          >
            Ubah Password
          </Button>
        </CardBody>
      </Card>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ubah Password</DialogTitle>
            <DialogDescription>
              Masukkan password saat ini sebelum menyimpan password baru.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <Input
              type="password"
              label="Password Saat Ini"
              autoComplete="current-password"
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />
            <Input
              type="password"
              label="Password Baru"
              autoComplete="new-password"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />
            <Input
              type="password"
              label="Konfirmasi Password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword')}
            />

            {passwordError && (
              <StatusBanner tone="danger" icon={AlertCircle} message={passwordError} />
            )}
            {passwordMessage && (
              <StatusBanner tone="success" icon={Check} message={passwordMessage} />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Tutup
              </Button>
              <Button type="submit" isLoading={changePasswordMutation.isPending}>
                Simpan Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
