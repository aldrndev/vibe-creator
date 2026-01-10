import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Button,
  Progress,
  Badge,
  Skeleton,
} from "@/components/ui";
import { Link, useNavigate } from "react-router-dom";
import { motion, useSpring, useTransform } from "framer-motion";
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
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

// Animated number component
function AnimatedNumber({
  value,
  isLoading,
}: {
  value: number;
  isLoading: boolean;
}) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      spring.set(value);
    }
  }, [value, isLoading, spring]);

  useEffect(() => {
    return display.on("change", (v) => setDisplayValue(v));
  }, [display]);

  if (isLoading) {
    return <Skeleton className="w-8 h-8 rounded" />;
  }

  return <span>{displayValue}</span>;
}

const quickActions = [
  {
    title: "New Project",
    description: "Start editing a new video",
    icon: FolderOpen,
    action: "new-project",
    color: "primary",
  },
  {
    title: "Create Prompt",
    description: "Generate script, voice, or video prompt",
    icon: Sparkles,
    href: "/dashboard/prompts/new",
    color: "secondary",
  },
  {
    title: "Loop Creator",
    description: "Create looping videos & GIFs",
    icon: Repeat,
    href: "/tools/loop-creator",
    color: "success",
  },
  {
    title: "Reaction Video",
    description: "Create reaction & tempel videos",
    icon: Video,
    href: "/tools/reaction-creator",
    color: "warning",
  },
  {
    title: "Live Streaming",
    description: "Stream to YouTube, TikTok, Twitch",
    icon: TrendingUp,
    href: "/tools/live-stream",
    color: "danger",
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
    if (action.action === "new-project") {
      navigate("/tools/editor");
    } else if (action.href) {
      navigate(action.href);
    }
  };

  // Calculate export usage percentage
  const exportsUsed = subscription?.exportsUsed ?? 0;
  const exportsLimit = subscription?.exportsLimit ?? 5;
  const isUnlimited = exportsLimit >= 999999 || user?.role === "ADMIN";
  const usagePercent = isUnlimited
    ? 0
    : Math.min((exportsUsed / exportsLimit) * 100, 100);
  const isNearLimit = usagePercent >= 80;

  // Get tier info
  const tierName =
    user?.role === "ADMIN"
      ? "Admin"
      : subscription?.tier === "PRO"
      ? "Pro"
      : subscription?.tier === "CREATOR"
      ? "Creator"
      : "Free";
  const tierVariant =
    user?.role === "ADMIN"
      ? "warning"
      : subscription?.tier === "PRO"
      ? "warning"
      : subscription?.tier === "CREATOR"
      ? "default"
      : "secondary";
  const TierIcon =
    subscription?.tier === "PRO" || user?.role === "ADMIN"
      ? Crown
      : subscription?.tier === "CREATOR"
      ? Sparkles
      : Zap;

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
            Selamat datang, {user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            Apa yang ingin kamu buat hari ini?
          </p>
        </div>
        <Badge variant={tierVariant as "default" | "secondary" | "warning"}>
          <TierIcon size={14} />
          {tierName}
        </Badge>
      </motion.div>

      {/* Export Usage Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Export Bulan Ini
                </p>
                <p className="text-2xl font-bold">
                  {isUnlimited ? (
                    <span className="flex items-center gap-2">
                      ∞{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        Unlimited
                      </span>
                    </span>
                  ) : (
                    <>
                      {exportsUsed}{" "}
                      <span className="text-lg font-normal text-muted-foreground">
                        / {exportsLimit}
                      </span>
                    </>
                  )}
                </p>
              </div>
              {subscription?.tier === "FREE" && (
                <Button asChild size="sm">
                  <Link to="/dashboard/pricing">
                    Upgrade
                    <Crown size={14} />
                  </Link>
                </Button>
              )}
            </div>
            {!isUnlimited && <Progress value={usagePercent} className="mt-2" />}
            {isNearLimit && !isUnlimited && (
              <p className="text-xs text-yellow-500 mt-2">
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
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleAction(action)}
            >
              <CardBody className="flex flex-row items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <action.icon className="text-primary" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <Plus size={20} className="text-muted-foreground" />
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
                  <div className="text-2xl font-bold">
                    <AnimatedNumber
                      value={safeStats.projects}
                      isLoading={isLoading}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Proyek</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Sparkles className="text-secondary-foreground" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    <AnimatedNumber
                      value={safeStats.prompts}
                      isLoading={isLoading}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Prompts</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Video className="text-green-500" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    <AnimatedNumber
                      value={safeStats.exports}
                      isLoading={isLoading}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Exports</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Download className="text-yellow-500" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    <AnimatedNumber
                      value={safeStats.downloads}
                      isLoading={isLoading}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Downloads</p>
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
            <Clock className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground">Belum ada aktivitas</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Mulai dengan membuat proyek atau prompt baru
            </p>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
