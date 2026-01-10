import { Card, CardBody, Badge } from "@/components/ui";
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
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{stats?.users.total || 0}</p>
            <p className="text-xs text-green-500">
              +{stats?.users.recent || 0} this week
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-green-500/20 text-green-500">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats?.revenue.total || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats?.revenue.payments || 0} payments
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-yellow-500/20 text-yellow-500">
            <FileVideo size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Exports</p>
            <p className="text-2xl font-bold">{stats?.exports.total || 0}</p>
            <p className="text-xs text-muted-foreground">
              {stats?.exports.recent || 0} today
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-secondary/20 text-secondary-foreground">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">By Tier</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary">
                {stats?.users.byTier.free || 0} Free
              </Badge>
              <Badge variant="default">
                {stats?.users.byTier.creator || 0} Creator
              </Badge>
              <Badge variant="warning">
                {stats?.users.byTier.pro || 0} Pro
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
