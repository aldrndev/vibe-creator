import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const timelineRows = ['Video', 'Text', 'Audio'] as const;
const statusCards = [
  {
    title: 'Loop Creator',
    label: 'Long loop ready',
    className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  },
  {
    title: 'Live Stream',
    label: 'RTMP ready',
    className: 'border-rose-400/25 bg-rose-500/10 text-rose-300',
  },
] as const;
const metricCards = [
  { label: 'Project aktif', value: '12' },
  { label: 'Export', value: '48' },
  { label: 'Download', value: 'Ready' },
] as const;

export function LandingProductPreview() {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/90 p-3 shadow-2xl shadow-black/20">
      <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              Workspace
            </p>
            <h2 className="mt-1 text-lg font-black text-foreground">Vibe Creator Dashboard</h2>
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-300">
            Auto-saved
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">Video Studio Timeline</p>
              <span className="text-[10px] font-bold text-muted-foreground">0:00 / 0:48</span>
            </div>
            <div className="space-y-2">
              {timelineRows.map((label, index) => (
                <div key={label} className="grid grid-cols-[3.5rem_1fr] items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
                  <div
                    className={cn(
                      'h-8 rounded-lg border',
                      index === 0 && 'border-primary/40 bg-primary/15',
                      index === 1 && 'w-2/3 border-sky-400/30 bg-sky-500/10',
                      index === 2 && 'w-4/5 border-emerald-400/30 bg-emerald-500/10',
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-border/60 bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp size={15} className="text-primary" />
                <span className="text-xs font-bold text-foreground">Trending to Short</span>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="line-clamp-2 text-sm font-bold text-foreground">
                  Video viral masuk AI Director
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Buat short dari link YouTube</p>
                <div className="mt-3 inline-flex rounded-full bg-primary px-3 py-1 text-[10px] font-black text-primary-foreground">
                  Buat Short
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {statusCards.map((status) => (
                <div key={status.title} className={cn('rounded-2xl border p-3', status.className)}>
                  <p className="text-sm font-black">{status.title}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {status.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {metricCards.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-border/60 bg-card px-3 py-2"
            >
              <p className="text-base font-black text-foreground">{metric.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
