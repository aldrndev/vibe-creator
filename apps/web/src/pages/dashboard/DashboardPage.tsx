import { motion, useSpring, useTransform } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Clock,
  Crown,
  Download,
  FolderOpen,
  Repeat,
  Sparkles,
  TrendingUp,
  Video,
  Wand2,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody } from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

// Animated number component
function AnimatedNumber({ value, isLoading }: Readonly<{ value: number; isLoading: boolean }>) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      spring.set(value);
    }
  }, [value, isLoading, spring]);

  useEffect(() => {
    return display.on('change', (v) => setDisplayValue(v));
  }, [display]);

  if (isLoading) {
    return <Skeleton className="h-8 w-12 rounded-lg opacity-50 bg-muted/20" />;
  }

  return <span>{displayValue}</span>;
}

const quickActions = [
  {
    title: 'AI Director',
    description: 'Automated video generation',
    icon: Sparkles,
    href: '/tools/ai-director',
    color: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500',
  },
  {
    title: 'Video Studio',
    description: 'Professional video editing',
    icon: Wand2,
    href: '/tools/video-studio',
    color: 'from-orange-500/20 to-amber-500/20',
    iconColor: 'text-orange-500',
  },
  {
    title: 'Loop Creator',
    description: 'Create looping videos & GIFs',
    icon: Repeat,
    href: '/tools/loop-creator',
    color: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-500',
  },
  {
    title: 'Reaction Video',
    description: 'Create reaction & tempel videos',
    icon: Video,
    href: '/tools/reaction-creator',
    color: 'from-purple-500/20 to-fuchsia-500/20',
    iconColor: 'text-purple-500',
  },
  {
    title: 'Live Streaming',
    description: 'Stream to YouTube, TikTok, Twitch',
    icon: TrendingUp,
    href: '/tools/live-stream',
    color: 'from-rose-500/20 to-red-500/20',
    iconColor: 'text-rose-500',
  },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, subscription } = useAuthStore();
  const { data: stats, isLoading } = useDashboardStats();

  const safeStats = stats ?? {
    projects: 0,
    prompts: 0,
    exports: 0,
    downloads: 0,
  };

  const handleAction = (action: { action?: string; href?: string }) => {
    if (action.action === 'new-project') {
      navigate('/tools/editor');
    } else if (action.href) {
      navigate(action.href);
    }
  };

  // Calculate export usage percentage
  const exportsUsed = subscription?.exportsUsed ?? 0;
  const exportsLimit = subscription?.exportsLimit ?? 5;
  const isUnlimited = exportsLimit >= 999999 || user?.role === 'ADMIN';
  const usagePercent = isUnlimited ? 0 : Math.min((exportsUsed / exportsLimit) * 100, 100);
  const isNearLimit = usagePercent >= 80;

  // Get tier info
  let tierName = 'Free';
  if (user?.role === 'ADMIN') {
    tierName = 'Admin';
  } else if (subscription?.tier === 'PRO') {
    tierName = 'Pro';
  } else if (subscription?.tier === 'CREATOR') {
    tierName = 'Creator';
  }

  let TierIcon = Zap;
  if (subscription?.tier === 'PRO' || user?.role === 'ADMIN') {
    TierIcon = Crown;
  } else if (subscription?.tier === 'CREATOR') {
    TierIcon = Sparkles;
  }

  return (
    <PageTransition className="pb-20 lg:pb-10">
      <div className="max-w-[1400px] mx-auto space-y-10">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-1">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter text-foreground leading-tight">
              Selamat datang,{' '}
              <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600 animate-gradient">
                {user?.name?.split(' ')[0]}
              </span>{' '}
              ! 👋
            </h1>
            <p className="text-muted-foreground font-medium text-sm md:text-base tracking-tight ml-0.5">
              Creator Dashboard & Toolset
            </p>
          </div>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-linear-to-r from-orange-400/20 via-amber-500/20 to-orange-400/20 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
            <div className="relative h-12 p-6 md:px-5 rounded-xl bg-background border border-orange-500/20 flex items-center gap-3.5 shadow-sm">
              <div className="size-8 rounded-lg bg-linear-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center border border-orange-500/10">
                <TierIcon size={16} className="text-orange-500 fill-orange-500/20" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Paket Aktif
                </span>
                <span className="text-sm font-black bg-linear-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent leading-none mt-0.5">
                  {tierName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Usage & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Card - Export Usage */}
          <div className="lg:col-span-8">
            <Card className="bg-card/70 backdrop-blur-xl border border-border/40 overflow-hidden relative group/usage h-full shadow-2xl shadow-black/5 hover:border-primary/20 transition-all duration-500">
              <CardBody className="p-6 md:p-10 relative z-10 flex flex-col justify-between h-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Activity size={20} className="text-primary" />
                      </div>
                      <p className="text-lg font-bold text-foreground/80 tracking-tight">
                        Kuota Produksi Video
                      </p>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <p className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-foreground drop-shadow-sm">
                        {isUnlimited ? '∞' : exportsUsed}
                      </p>
                      {!isUnlimited && (
                        <p className="text-2xl md:text-3xl font-bold text-muted-foreground/30">
                          / {exportsLimit}
                        </p>
                      )}
                      {isUnlimited && (
                        <p className="text-xl md:text-2xl font-bold text-muted-foreground/40">
                          Unlimited
                        </p>
                      )}
                    </div>
                  </div>

                  {tierName === 'Free' && (
                    <Button
                      asChild
                      size="lg"
                      className="w-full sm:w-auto rounded-xl font-bold uppercase text-xs tracking-widest h-14 px-8 bg-linear-to-r from-primary to-orange-600 hover:scale-[1.02] shadow-lg shadow-primary/20 transition-all active:scale-95 border-none"
                    >
                      <Link to="/dashboard/pricing" className="flex items-center gap-3">
                        Upgrade Pro <Crown size={18} />
                      </Link>
                    </Button>
                  )}
                </div>

                <div className="space-y-5">
                  {!isUnlimited && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                        <span className="text-muted-foreground/70">Monthly Usage</span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md bg-background/50 border border-border/10',
                            isNearLimit ? 'text-red-500' : 'text-primary',
                          )}
                        >
                          {Math.round(usagePercent)}%
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-foreground/5 overflow-hidden border border-border/10 p-[2px]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${usagePercent}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={cn(
                            'h-full rounded-full transition-all duration-1000 shadow-sm relative overflow-hidden',
                            isNearLimit
                              ? 'bg-linear-to-r from-red-500 to-rose-600'
                              : 'bg-linear-to-r from-primary to-orange-500',
                          )}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                        </motion.div>
                      </div>
                    </div>
                  )}
                  {isNearLimit && !isUnlimited && (
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs font-semibold text-rose-500 flex items-center gap-2 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20"
                    >
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Hampir mencapai limit produksi. Upgrade untuk konten tanpa batas.
                    </motion.p>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Mini Stats Grid */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4">
            <Card className="bg-card/70 backdrop-blur-xl border border-border/40 hover:border-primary/50 transition-all duration-300 group/stat hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
              <CardBody className="p-5 md:p-6 flex flex-col justify-between h-32 md:h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover/stat:scale-110 group-hover/stat:bg-primary group-hover/stat:text-white transition-all duration-300">
                  <FolderOpen
                    size={22}
                    className="text-primary group-hover/stat:text-white transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-2xl md:text-3xl font-black tracking-tighter">
                    <AnimatedNumber value={safeStats.projects} isLoading={isLoading} />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Proyek
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-card/70 backdrop-blur-xl border border-border/40 hover:border-orange-500/50 transition-all duration-300 group/stat hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/5">
              <CardBody className="p-5 md:p-6 flex flex-col justify-between h-32 md:h-full">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover/stat:scale-110 group-hover/stat:bg-orange-500 group-hover/stat:text-white transition-all duration-300">
                  <Sparkles
                    size={22}
                    className="text-orange-500 group-hover/stat:text-white transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-2xl md:text-3xl font-black tracking-tighter">
                    <AnimatedNumber value={safeStats.prompts} isLoading={isLoading} />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Prompts
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-card/70 backdrop-blur-xl border border-border/40 hover:border-rose-500/50 transition-all duration-300 group/stat hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/5">
              <CardBody className="p-5 md:p-6 flex flex-col justify-between h-32 md:h-full">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover/stat:scale-110 group-hover/stat:bg-rose-500 group-hover/stat:text-white transition-all duration-300">
                  <Video
                    size={22}
                    className="text-rose-500 group-hover/stat:text-white transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-2xl md:text-3xl font-black tracking-tighter">
                    <AnimatedNumber value={safeStats.exports} isLoading={isLoading} />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Exports
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-card/70 backdrop-blur-xl border border-border/40 hover:border-amber-500/50 transition-all duration-300 group/stat hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5">
              <CardBody className="p-5 md:p-6 flex flex-col justify-between h-32 md:h-full">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover/stat:scale-110 group-hover/stat:bg-amber-500 group-hover/stat:text-white transition-all duration-300">
                  <Download
                    size={22}
                    className="text-amber-500 group-hover/stat:text-white transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-2xl md:text-3xl font-black tracking-tighter">
                    <AnimatedNumber value={safeStats.downloads} isLoading={isLoading} />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Downloads
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 ml-1">
            <Zap size={20} className="text-primary fill-primary" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">Aksi Cepat & Tools</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className="group bg-card/70 backdrop-blur-xl border border-border/40 hover:border-primary/50 transition-all duration-300 rounded-3xl overflow-hidden cursor-pointer relative hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
                onClick={() => handleAction(action)}
              >
                <CardBody className="p-6 relative z-10 flex flex-col items-center text-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-white/5 relative overflow-hidden">
                    <action.icon
                      className={cn(
                        'transition-all duration-500 relative z-10',
                        action.iconColor,
                        'group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]',
                      )}
                      size={40}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-base text-foreground transition-colors leading-tight">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground/80 font-medium line-clamp-2 leading-relaxed px-2">
                      {action.description}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-y-[-5px]">
                    <ArrowRight size={16} className="text-primary" />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-12 bg-border/50" />
            <Activity size={18} className="text-muted-foreground/50" />
            <h2 className="text-sm md:text-base font-bold text-muted-foreground/70 tracking-tight">
              Aktivitas Terbaru
            </h2>
            <div className="h-px w-12 bg-border/50" />
          </div>

          <Card className="bg-card/70 backdrop-blur-xl border-border/50 border-dashed rounded-4xl md:rounded-5xl overflow-hidden">
            <CardBody className="py-12 md:py-20 flex flex-col items-center gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-muted/10 flex items-center justify-center relative">
                <Clock
                  className="text-muted-foreground/20 animate-pulse w-10 h-10 md:w-12 md:h-12"
                  strokeWidth={1}
                />
                <div className="absolute inset-0 border border-muted-foreground/10 rounded-full animate-ping scale-150 opacity-10" />
              </div>
              <div className="space-y-2 px-6">
                <h3 className="text-xl md:text-2xl font-bold text-foreground/80">
                  Siap Rakit Konten Viral?
                </h3>
                <p className="text-sm md:text-base text-muted-foreground/60 font-medium max-w-sm mx-auto leading-relaxed">
                  Dashboard kamu masih kosong. Mulai kreasikan ide cemerlangmu sekarang!
                </p>
              </div>
              <Button
                className="mt-md rounded-full h-11 md:h-12 px-xl font-semibold text-xs md:text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
                onClick={() => navigate('/dashboard/prompts/new')}
              >
                Buat Prompt AI Sekarang <ArrowRight size={14} className="ml-3" />
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
