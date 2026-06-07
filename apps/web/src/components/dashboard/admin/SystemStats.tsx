import { DollarSign, FileVideo, TrendingUp, Users } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import type { AdminStats } from '@/hooks/useAdminData';

interface SystemStatsProps {
  stats: AdminStats | null;
}

export function SystemStats({ stats }: SystemStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      <UserStats stats={stats} />
      <RevenueStats stats={stats} formatCurrency={formatCurrency} />
      <ExportStats stats={stats} />
      <DistributionStats stats={stats} />
    </div>
  );
}

function UserStats({ stats }: { stats: AdminStats | null }) {
  return (
    <Card className="bg-card/50 border-border/50 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardBody className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Users size={20} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-foreground tracking-tight">
              {stats?.users.total || 0}
            </h3>
            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-md">
              +{stats?.users.recent || 0}
            </span>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Active Users
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
            <span className="rounded-full bg-green-500/10 px-2 py-1 text-green-500">
              {stats?.users.byStatus.active || 0} active
            </span>
            <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-yellow-500">
              {stats?.users.byStatus.suspended || 0} suspended
            </span>
            <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
              {stats?.users.byStatus.deleted || 0} deleted
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function RevenueStats({
  stats,
  formatCurrency,
}: {
  stats: AdminStats | null;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <Card className="bg-card/50 border-border/50 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardBody className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between">
          <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500 ring-1 ring-green-500/20">
            <DollarSign size={20} />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-black text-foreground tracking-tight">
            {formatCurrency(stats?.revenue.total || 0)}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">
            From <span className="font-bold text-foreground">{stats?.revenue.payments || 0}</span>{' '}
            payments
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Total Revenue
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function ExportStats({ stats }: { stats: AdminStats | null }) {
  return (
    <Card className="bg-card/50 border-border/50 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardBody className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20">
            <FileVideo size={20} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-foreground tracking-tight">
              {stats?.exports.total || 0}
            </h3>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
              +{stats?.exports.recent || 0}
            </span>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Total Exports
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function DistributionStats({ stats }: { stats: AdminStats | null }) {
  return (
    <Card className="bg-card/50 border-border/50 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardBody className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 ring-1 ring-purple-500/20">
            <TrendingUp size={20} />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Distribution
          </p>
        </div>

        <div className="space-y-3 mt-1">
          {/* Free */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-muted-foreground">Free</span>
              <span>{stats?.users.byTier.free || 0}</span>
            </div>
            <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-muted-foreground/30"
                style={{
                  width: `${Math.min(
                    ((stats?.users.byTier.free || 0) / (stats?.users.total || 1)) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Creator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-orange-500">Creator</span>
              <span className="text-orange-500">{stats?.users.byTier.creator || 0}</span>
            </div>
            <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500"
                style={{
                  width: `${Math.min(
                    ((stats?.users.byTier.creator || 0) / (stats?.users.total || 1)) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Pro */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-purple-500">Pro</span>
              <span className="text-purple-500">{stats?.users.byTier.pro || 0}</span>
            </div>
            <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{
                  width: `${Math.min(
                    ((stats?.users.byTier.pro || 0) / (stats?.users.total || 1)) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
