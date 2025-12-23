import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Progress, Chip } from '@heroui/react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FolderOpen, 
  Sparkles, 
  Plus,
  TrendingUp,
  Clock,
  Video,
  Repeat,
  Download,
  Crown,
  Zap
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface UserStats {
  projects: number;
  prompts: number;
  exports: number;
  downloads: number;
}

const quickActions = [
  { 
    title: 'New Project', 
    description: 'Start editing a new video',
    icon: FolderOpen, 
    action: 'new-project',
    color: 'primary'
  },
  { 
    title: 'Create Prompt', 
    description: 'Generate script, voice, or video prompt',
    icon: Sparkles, 
    href: '/dashboard/prompts/new',
    color: 'secondary'
  },
  { 
    title: 'Loop Creator', 
    description: 'Create looping videos & GIFs',
    icon: Repeat, 
    href: '/tools/loop-creator',
    color: 'success'
  },
  { 
    title: 'Reaction Video', 
    description: 'Create reaction & tempel videos',
    icon: Video, 
    href: '/tools/reaction-creator',
    color: 'warning'
  },
  { 
    title: 'Live Streaming', 
    description: 'Stream to YouTube, TikTok, Twitch',
    icon: TrendingUp, 
    href: '/tools/live-stream',
    color: 'danger'
  },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, subscription } = useAuthStore();
  const [stats, setStats] = useState<UserStats>({ projects: 0, prompts: 0, exports: 0, downloads: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch projects count
        const projectsRes = await fetch('/api/v1/projects?limit=1', { credentials: 'include' });
        const projectsData = projectsRes.ok ? await projectsRes.json() : { meta: { total: 0 } };
        
        // Fetch prompts count  
        const promptsRes = await fetch('/api/v1/prompts?limit=1', { credentials: 'include' });
        const promptsData = promptsRes.ok ? await promptsRes.json() : { meta: { total: 0 } };
        
        // Fetch exports count
        const exportsRes = await fetch('/api/v1/export/history', { credentials: 'include' });
        const exportsData = exportsRes.ok ? await exportsRes.json() : { data: [] };
        
        // Fetch downloads count
        const downloadsRes = await fetch('/api/v1/download/history', { credentials: 'include' });
        const downloadsData = downloadsRes.ok ? await downloadsRes.json() : { data: [] };

        setStats({
          projects: projectsData.meta?.total ?? projectsData.data?.length ?? 0,
          prompts: promptsData.meta?.total ?? promptsData.data?.length ?? 0,
          exports: exportsData.data?.length ?? 0,
          downloads: downloadsData.data?.length ?? 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleAction = (action: { action?: string; href?: string }) => {
    if (action.action === 'new-project') {
      const newId = `project-${Date.now()}`;
      navigate(`/editor/${newId}`);
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
  const tierName = user?.role === 'ADMIN' ? 'Admin' : subscription?.tier === 'PRO' ? 'Pro' : subscription?.tier === 'CREATOR' ? 'Creator' : 'Free';
  const tierColor = user?.role === 'ADMIN' ? 'warning' : subscription?.tier === 'PRO' ? 'warning' : subscription?.tier === 'CREATOR' ? 'primary' : 'default';
  const TierIcon = subscription?.tier === 'PRO' || user?.role === 'ADMIN' ? Crown : subscription?.tier === 'CREATOR' ? Sparkles : Zap;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold mb-2">
            Selamat datang, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-foreground/60">
            Apa yang ingin kamu buat hari ini?
          </p>
        </div>
        <Chip 
          color={tierColor as 'default' | 'primary' | 'warning'}
          variant="flat"
          startContent={<TierIcon size={14} />}
          size="lg"
        >
          {tierName}
        </Chip>
      </motion.div>

      {/* Export Usage Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border-primary/20">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-foreground/60">Export Bulan Ini</p>
                <p className="text-2xl font-bold">
                  {isUnlimited ? (
                    <span className="flex items-center gap-2">
                      ∞ <span className="text-sm font-normal text-foreground/60">Unlimited</span>
                    </span>
                  ) : (
                    <>
                      {exportsUsed} <span className="text-lg font-normal text-foreground/60">/ {exportsLimit}</span>
                    </>
                  )}
                </p>
              </div>
              {subscription?.tier === 'FREE' && (
                <Button 
                  as={Link} 
                  to="/dashboard/pricing" 
                  color="primary" 
                  size="sm"
                  endContent={<Crown size={14} />}
                >
                  Upgrade
                </Button>
              )}
            </div>
            {!isUnlimited && (
              <Progress 
                value={usagePercent} 
                color={isNearLimit ? 'warning' : 'primary'}
                size="sm"
                className="mt-2"
              />
            )}
            {isNearLimit && !isUnlimited && (
              <p className="text-xs text-warning mt-2">
                ⚠️ Hampir mencapai limit. Upgrade untuk lebih banyak export.
              </p>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold mb-4">Aksi Cepat</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Card 
              key={action.title}
              isPressable
              onPress={() => handleAction(action)}
              className="hover:border-primary/50 transition-colors"
            >
              <CardBody className="flex flex-row items-center gap-4 p-4">
                <div className={`w-12 h-12 rounded-lg bg-${action.color}/10 flex items-center justify-center`}>
                  <action.icon className={`text-${action.color}`} size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-sm text-foreground/60">{action.description}</p>
                </div>
                <Plus size={20} className="text-foreground/40" />
              </CardBody>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold mb-4">Statistik</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="text-primary" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? '-' : stats.projects}</p>
                  <p className="text-sm text-foreground/60">Proyek</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Sparkles className="text-secondary" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? '-' : stats.prompts}</p>
                  <p className="text-sm text-foreground/60">Prompts</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Video className="text-success" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? '-' : stats.exports}</p>
                  <p className="text-sm text-foreground/60">Exports</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Download className="text-warning" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? '-' : stats.downloads}</p>
                  <p className="text-sm text-foreground/60">Downloads</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold mb-4">Aktivitas Terbaru</h2>
        <Card>
          <CardBody className="p-8 text-center">
            <Clock className="mx-auto mb-4 text-foreground/40" size={48} />
            <p className="text-foreground/60">Belum ada aktivitas</p>
            <p className="text-sm text-foreground/40 mt-1">
              Mulai dengan membuat proyek atau prompt baru
            </p>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
