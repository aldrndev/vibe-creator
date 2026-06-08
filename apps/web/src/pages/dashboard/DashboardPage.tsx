import { Link, useNavigate } from '@tanstack/react-router';
import type { DashboardRecentWorkspace, DashboardSummaryResponse } from '@vibe-creator/shared';
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Crown,
  Download,
  FolderClock,
  FolderOpen,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DashboardThumbnail } from '@/components/dashboard/dashboard-thumbnail';
import { Badge, Button, Card, CardBody, Progress } from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { useDashboardSummary } from '@/hooks/use-dashboard-summary';
import {
  dashboardQuickActions,
  getDashboardToolIcon,
  getDashboardToolLabel,
} from '@/lib/dashboard-home';
import { cn } from '@/lib/utils';
import { downloadAuthenticatedFile } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

const dashboardDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Tanpa batas waktu';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Tanpa batas waktu';
  }

  return dashboardDateFormatter.format(date).replace('.', ':');
}

function getExpiryLabel(value: string | null): string {
  if (!value) {
    return 'Tanpa batas waktu';
  }

  const expiresAt = new Date(value).getTime();
  if (Number.isNaN(expiresAt)) {
    return 'Tanpa batas waktu';
  }

  const diffMs = expiresAt - Date.now();
  if (diffMs <= 0) {
    return 'Berakhir';
  }

  const hours = Math.ceil(diffMs / (60 * 60 * 1000));
  if (hours < 48) {
    return `${hours}h tersisa`;
  }

  return `${Math.ceil(hours / 24)} hari tersisa`;
}

function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-48 rounded-2xl lg:col-span-7" />
        <Skeleton className="h-48 rounded-2xl lg:col-span-5" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {['stats-1', 'stats-2', 'stats-3', 'stats-4'].map((id) => (
          <Skeleton key={id} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

interface StatCardProps {
  readonly label: string;
  readonly value: number;
  readonly icon: typeof FolderOpen;
  readonly to: string;
  readonly accentClass: string;
  readonly hoverClass: string;
}

function StatCard({ label, value, icon: Icon, to, accentClass, hoverClass }: StatCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex h-full min-h-28 flex-col justify-center rounded-2xl border border-border/60 bg-card/70 p-3.5 transition-all duration-300 hover:-translate-y-1 hover:bg-card/95 hover:shadow-md',
        hoverClass,
      )}
    >
      <div
        className={cn(
          'mb-3 flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300 group-hover:scale-105',
          accentClass,
        )}
      >
        <Icon size={17} className="transition-transform group-hover:scale-110" />
      </div>
      <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </Link>
  );
}

interface QuotaCardProps {
  readonly summary: DashboardSummaryResponse;
}

function QuotaCard({ summary }: QuotaCardProps) {
  const { quota } = summary;
  const isNearLimit = !quota.isUnlimited && quota.usagePercent >= 80;
  const tierLabel =
    quota.tier === 'ADMIN' ? 'Admin' : quota.tier[0] + quota.tier.slice(1).toLowerCase();

  return (
    <Card className="h-full border-border/60 bg-card/75 backdrop-blur-md">
      <CardBody className="flex h-full flex-col justify-center p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-linear-to-br from-primary/15 via-orange-500/10 to-rose-600/10 text-primary">
                {quota.isUnlimited ? (
                  <Crown size={19} className="animate-pulse" />
                ) : (
                  <Zap size={19} />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Kuota Produksi</p>
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  {quota.isUnlimited ? (
                    <>
                      Unlimited
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </>
                  ) : (
                    `${quota.exportsUsed}/${quota.exportsLimit}`
                  )}
                </h2>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Paket aktif: <span className="font-semibold text-foreground">{tierLabel}</span>
              {quota.isUnlimited
                ? '. Akses admin dengan export tanpa batas.'
                : `, sisa ${quota.remaining} export bulan ini.`}
            </p>
            {quota.isUnlimited && (
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/10 to-orange-500/5 px-3 py-2">
                  <p className="text-xs font-bold text-primary">Admin</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    Full access
                  </p>
                </div>
                <div className="rounded-xl border border-orange-500/15 bg-linear-to-br from-orange-500/10 to-rose-500/5 px-3 py-2">
                  <p className="text-xs font-bold text-orange-400">Export</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    Tanpa limit
                  </p>
                </div>
                <div className="rounded-xl border border-rose-500/15 bg-linear-to-br from-rose-500/10 to-pink-500/5 px-3 py-2">
                  <p className="text-xs font-bold text-rose-400">Download</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    Tetap expiry
                  </p>
                </div>
              </div>
            )}
          </div>
          {!quota.isUnlimited && (
            <Button
              asChild
              className="h-11 rounded-xl px-5 font-semibold bg-linear-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 shadow-sm transition-all duration-200"
            >
              <Link to="/dashboard/pricing">
                Upgrade Plan <ArrowRight size={16} />
              </Link>
            </Button>
          )}
        </div>
        {!quota.isUnlimited && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Usage</span>
              <span className={cn(isNearLimit && 'text-rose-500')}>
                {Math.round(quota.usagePercent)}%
              </span>
            </div>
            <Progress value={quota.usagePercent} className="h-2" />
            {isNearLimit && (
              <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">
                Kuota hampir habis. Upgrade agar proses export tidak tertahan.
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

interface WorkspaceRowProps {
  readonly item: DashboardRecentWorkspace;
}

function WorkspaceRow({ item }: WorkspaceRowProps) {
  const ToolIcon = getDashboardToolIcon(item.tool);

  return (
    <Link
      to={item.continueUrl}
      className="group flex items-center gap-3 rounded-2xl border border-border/55 bg-background/35 p-3 transition-colors hover:border-primary/45 hover:bg-primary/5"
    >
      <DashboardThumbnail thumbnailUrl={item.thumbnailUrl} tool={item.tool} className="h-16 w-24" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-border/70 px-2 py-0 text-[10px]">
            <ToolIcon size={12} />
            {getDashboardToolLabel(item.tool)}
          </Badge>
          <span className="text-xs font-semibold text-muted-foreground">
            {getExpiryLabel(item.expiresAt)}
          </span>
        </div>
        <p className="mt-2 line-clamp-1 text-sm font-bold text-foreground">{item.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Diedit {formatDateTime(item.updatedAt)}
        </p>
      </div>
      <ArrowRight
        size={18}
        className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
      />
    </Link>
  );
}

function LatestExportCard({ summary }: QuotaCardProps) {
  const exportItem = summary.latestExport;
  if (!exportItem) {
    return (
      <div className="group flex items-center gap-3 rounded-2xl border border-dashed border-border/40 bg-background/15 p-4 transition-all duration-300 hover:border-primary/30 hover:bg-background/25">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/10 text-muted-foreground transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105">
          <Download size={17} className="transition-transform group-hover:translate-y-0.5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
            Belum ada download aktif
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Export siap download akan muncul di sini.
          </p>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    void downloadAuthenticatedFile(exportItem.downloadUrl, `${exportItem.title}.mp4`);
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-transparent p-4 backdrop-blur-md">
      <div className="flex gap-3">
        <DashboardThumbnail
          thumbnailUrl={exportItem.thumbnailUrl}
          tool="export"
          className="h-20 w-28 shadow-md"
        />
        <div className="min-w-0 flex-1">
          <Badge variant="outline" className="mb-2 border-primary/35 text-primary">
            Export
          </Badge>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
            {exportItem.title}
          </h3>
          <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
            Download tersedia sampai {formatDateTime(exportItem.downloadExpiresAt)}
          </p>
        </div>
      </div>
      <Button
        className="mt-4 h-11 w-full rounded-xl font-semibold bg-linear-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 shadow-sm transition-all duration-200 active:scale-98"
        onClick={handleDownload}
      >
        <Download size={16} />
        Download
      </Button>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-background/25 p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles size={22} />
      </div>
      <h3 className="text-lg font-bold text-foreground">Mulai proyek pertama</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Pilih tool utama untuk membuat short, edit video, reaction, loop, atau live stream.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild className="rounded-xl">
          <Link to="/tools/ai-director">Mulai AI Director</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/tools/video-studio">Buka Video Studio</Link>
        </Button>
      </div>
    </div>
  );
}

function DashboardError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <Card className="border-destructive/30 bg-card/80">
      <CardBody className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard belum bisa dimuat</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Coba refresh data dashboard. Kalau masih gagal, cek koneksi atau session login.
          </p>
        </div>
        <Button className="rounded-xl" onClick={onRetry}>
          <RefreshCw size={16} />
          Coba Lagi
        </Button>
      </CardBody>
    </Card>
  );
}

const quickActionHoverStyles: Record<string, string> = {
  '/tools/ai-director':
    'hover:border-sky-500/30 hover:bg-sky-500/5 hover:shadow-[0_0_25px_rgba(56,189,248,0.06)]',
  '/tools/video-studio':
    'hover:border-orange-500/30 hover:bg-orange-500/5 hover:shadow-[0_0_25px_rgba(249,115,22,0.06)]',
  '/tools/loop-creator':
    'hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:shadow-[0_0_25px_rgba(16,185,129,0.06)]',
  '/tools/reaction':
    'hover:border-violet-500/30 hover:bg-violet-500/5 hover:shadow-[0_0_25px_rgba(139,92,246,0.06)]',
  '/tools/live-stream-history':
    'hover:border-rose-500/30 hover:bg-rose-500/5 hover:shadow-[0_0_25px_rgba(244,63,94,0.06)]',
};

const quickActionTextStyles: Record<string, string> = {
  '/tools/ai-director': 'text-sky-400 group-hover:text-sky-300',
  '/tools/video-studio': 'text-orange-400 group-hover:text-orange-300',
  '/tools/loop-creator': 'text-emerald-400 group-hover:text-emerald-300',
  '/tools/reaction': 'text-violet-400 group-hover:text-violet-300',
  '/tools/live-stream-history': 'text-rose-400 group-hover:text-rose-300',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: summary, error, isLoading, refetch } = useDashboardSummary();

  return (
    <PageTransition>
      <div className="relative mx-auto max-w-330 space-y-6">
        {/* Ambient background glow orbs */}
        <div className="absolute -top-12 -left-12 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="absolute top-[35%] -right-12 -z-10 h-96 w-96 rounded-full bg-rose-500/3 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-12 -left-12 -z-10 h-80 w-80 rounded-full bg-sky-500/3 blur-[110px] pointer-events-none" />

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <FolderClock size={15} />
              Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Halo, {user?.name?.split(' ')[0] ?? 'Creator'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground md:text-base">
              Lanjutkan pekerjaan, pantau kuota, dan ambil hasil export yang masih tersedia.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-11 rounded-xl shadow-xs transition-all hover:bg-muted"
            onClick={() => navigate({ to: '/dashboard/history' })}
          >
            Buka Riwayat
            <ArrowRight size={16} />
          </Button>
        </div>

        {isLoading && <DashboardLoading />}

        {!isLoading && error && <DashboardError onRetry={() => void refetch()} />}

        {!isLoading && !error && summary && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <QuotaCard summary={summary} />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:h-full lg:grid-rows-2">
                <StatCard
                  label="Proyek Aktif"
                  value={summary.stats.activeProjects}
                  icon={FolderOpen}
                  to="/dashboard/projects"
                  accentClass="text-sky-400 bg-sky-500/10 border-sky-500/15"
                  hoverClass="hover:border-sky-500/30 hover:shadow-[0_0_20px_rgba(56,189,248,0.05)]"
                />
                <StatCard
                  label="Prompt"
                  value={summary.stats.prompts}
                  icon={Sparkles}
                  to="/dashboard/prompts"
                  accentClass="text-violet-400 bg-violet-500/10 border-violet-500/15"
                  hoverClass="hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.05)]"
                />
                <StatCard
                  label="Total Export"
                  value={summary.stats.exports}
                  icon={Download}
                  to="/dashboard/history"
                  accentClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/15"
                  hoverClass="hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                />
                <StatCard
                  label="Download Aktif"
                  value={summary.stats.downloads}
                  icon={FolderClock}
                  to="/dashboard/downloads"
                  accentClass="text-amber-400 bg-amber-500/10 border-amber-500/15"
                  hoverClass="hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <Card className="h-full border-border/60 bg-card/75 backdrop-blur-md">
                <CardBody className="p-5 md:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Lanjutkan Pekerjaan</h2>
                      <p className="text-sm text-muted-foreground">
                        Draft dan session aktif terbaru.
                      </p>
                    </div>
                    <Button asChild variant="ghost" className="hidden rounded-xl sm:inline-flex">
                      <Link to="/dashboard/history">
                        Semua <ArrowRight size={15} />
                      </Link>
                    </Button>
                  </div>
                  {summary.recentWorkspaces.length > 0 ? (
                    <div className="space-y-3">
                      {summary.recentWorkspaces.map((item) => (
                        <WorkspaceRow key={item.id} item={item} />
                      ))}
                    </div>
                  ) : (
                    <EmptyActivity />
                  )}
                </CardBody>
              </Card>

              <div className="flex flex-col gap-5">
                <Card className="border-border/60 bg-card/75 backdrop-blur-md">
                  <CardBody className="p-5 md:p-6">
                    <h2 className="mb-4 text-lg font-bold text-foreground">Export Terbaru</h2>
                    <LatestExportCard summary={summary} />
                  </CardBody>
                </Card>

                {summary.expiringSoon.length > 0 && (
                  <Card className="border-amber-500/25 bg-amber-500/5 backdrop-blur-md">
                    <CardBody className="p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Clock size={17} className="text-amber-400" />
                        <h2 className="font-bold text-foreground">Hampir Berakhir</h2>
                      </div>
                      <div className="space-y-3">
                        {summary.expiringSoon.map((item) => (
                          <Link
                            key={item.id}
                            to={item.continueUrl}
                            className="block rounded-xl border border-amber-500/15 bg-background/25 p-3 transition-colors hover:bg-amber-500/10"
                          >
                            <p className="line-clamp-1 text-sm font-bold text-foreground">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs text-amber-300">
                              Berakhir {formatDateTime(item.expiresAt)}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </div>

            <section className="space-y-4 pb-6">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-primary" />
                <h2 className="text-lg font-bold text-foreground">Aksi Cepat</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {dashboardQuickActions.map((action) => (
                  <Link
                    key={action.title}
                    to={action.href}
                    className={cn(
                      'group rounded-2xl border border-border/60 bg-card/70 p-3.5 transition-all duration-300 ease-out hover:-translate-y-1 backdrop-blur-md',
                      quickActionHoverStyles[action.href],
                    )}
                  >
                    <div
                      className={cn(
                        'mb-3 flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300 group-hover:scale-105',
                        action.accentClass,
                      )}
                    >
                      <action.icon
                        size={17}
                        className="transition-transform group-hover:scale-110"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-foreground transition-colors group-hover:text-white">
                      {action.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground group-hover:text-muted-foreground/80">
                      {action.description}
                    </p>
                    <div
                      className={cn(
                        'mt-3 flex items-center text-[11px] font-bold uppercase tracking-wide transition-colors',
                        quickActionTextStyles[action.href] ?? 'text-primary',
                      )}
                    >
                      Buka Tool
                      <ArrowRight
                        size={14}
                        className="ml-2 transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </PageTransition>
  );
}
