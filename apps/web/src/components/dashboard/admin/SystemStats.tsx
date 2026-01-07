import { Card, CardBody, Chip } from "@heroui/react";
import { Users, DollarSign, FileVideo, TrendingUp } from "lucide-react";
import { AdminStats } from "@/hooks/useAdminData";

interface SystemStatsProps {
  stats: AdminStats | null;
}

export function SystemStats({ stats }: SystemStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/20 text-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-foreground/60">Total Users</p>
            <p className="text-2xl font-bold">{stats?.users.total || 0}</p>
            <p className="text-xs text-success">
              +{stats?.users.recent || 0} this week
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-success/20 text-success">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-foreground/60">Total Revenue</p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats?.revenue.total || 0)}
            </p>
            <p className="text-xs text-foreground/60">
              {stats?.revenue.payments || 0} payments
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/20 text-warning">
            <FileVideo size={24} />
          </div>
          <div>
            <p className="text-sm text-foreground/60">Total Exports</p>
            <p className="text-2xl font-bold">{stats?.exports.total || 0}</p>
            <p className="text-xs text-foreground/60">
              {stats?.exports.recent || 0} today
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-secondary/20 text-secondary">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-foreground/60">By Tier</p>
            <div className="flex gap-2 mt-1">
              <Chip size="sm" color="default">
                {stats?.users.byTier.free || 0} Free
              </Chip>
              <Chip size="sm" color="primary">
                {stats?.users.byTier.creator || 0} Creator
              </Chip>
              <Chip size="sm" color="warning">
                {stats?.users.byTier.pro || 0} Pro
              </Chip>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
