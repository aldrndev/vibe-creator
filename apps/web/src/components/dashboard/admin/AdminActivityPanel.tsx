import { CreditCard, FileVideo, UserPlus } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import type { AdminActivity } from '@/hooks/useAdminData';

interface AdminActivityPanelProps {
  activity: AdminActivity[];
  isLoading: boolean;
}

export function AdminActivityPanel({ activity, isLoading }: AdminActivityPanelProps) {
  return (
    <Card className="rounded-xl border border-border/40 bg-card/70 shadow-none">
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/5 p-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Recent Activity</h2>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Export, payment, dan signup terbaru
          </p>
        </div>
      </div>
      <CardBody className="p-0">
        {(() => {
          if (isLoading) {
            return (
              <div className="py-12 text-center text-xs font-bold text-muted-foreground">
                Memuat aktivitas...
              </div>
            );
          }
          if (activity.length === 0) {
            return (
              <div className="py-12 text-center text-xs font-bold text-muted-foreground">
                Belum ada aktivitas.
              </div>
            );
          }
          return (
            <div className="divide-y divide-border/40">
              {activity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-4">
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-2 text-muted-foreground">
                    <ActivityIcon type={item.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{getActivityTitle(item)}</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatActivityTime(item.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </CardBody>
    </Card>
  );
}

function ActivityIcon({ type }: { type: AdminActivity['type'] }) {
  if (type === 'payment') return <CreditCard size={16} />;
  if (type === 'export') return <FileVideo size={16} />;
  return <UserPlus size={16} />;
}

function getActivityTitle(item: AdminActivity): string {
  if (item.type === 'payment') {
    return `${item.user?.name ?? 'User'} paid ${formatCurrency(item.amount ?? 0)}`;
  }

  if (item.type === 'export') {
    return `${item.user?.name ?? 'User'} export ${item.status ?? 'created'}`;
  }

  return `${item.name ?? 'User'} joined`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatActivityTime(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
