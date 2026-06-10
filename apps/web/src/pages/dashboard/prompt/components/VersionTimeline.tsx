import { Clock } from 'lucide-react';
import type { PromptVersion } from '@/hooks/use-prompts';
import { cn } from '@/lib/utils';

export interface VersionTimelineProps {
  versions: PromptVersion[];
  currentVersionId: string | null;
  selectedVersionId: string | null;
  onSelectVersion: (id: string) => void;
}

export function VersionTimeline({
  versions,
  currentVersionId,
  selectedVersionId,
  onSelectVersion,
}: Readonly<VersionTimelineProps>) {
  if (versions.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground font-medium">
        Belum ada riwayat versi.
      </div>
    );
  }

  // Find actual selected version ID (fallback to first version if null/not found)
  const activeSelectedId = selectedVersionId ?? versions[0]?.id ?? '';

  return (
    <div className="relative flex flex-col gap-6 py-2 px-1">
      {/* Vertical Timeline Connection Line */}
      <div className="absolute left-[13px] top-[14px] bottom-[14px] w-0.5 bg-border/20" />

      {versions.map((version) => {
        const isSelected = activeSelectedId === version.id;
        const isActive = currentVersionId === version.id;

        // Compute styling dynamically to avoid nested ternaries
        let dotStyles =
          'bg-card border-border/80 text-muted-foreground group-hover/node:border-muted-foreground/60 group-hover/node:text-foreground';
        if (isSelected) {
          dotStyles =
            'bg-primary/15 border-primary text-primary shadow-md shadow-primary/20 scale-105';
        } else if (isActive) {
          dotStyles = 'bg-primary/5 border-primary/40 text-primary/80';
        }

        return (
          <button
            type="button"
            key={version.id}
            onClick={() => onSelectVersion(version.id)}
            className="w-full text-left relative flex gap-4 items-start group/node cursor-pointer select-none outline-none animate-fade-in"
          >
            {/* Timeline Dot Indicator */}
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300 shrink-0 text-[10px] font-black',
                dotStyles,
              )}
            >
              V{version.version}
            </div>

            {/* Version Content Card */}
            <div
              className={cn(
                'flex-1 p-3.5 rounded-2xl border transition-all duration-300 text-left flex flex-col gap-1.5',
                isSelected
                  ? 'bg-primary/10 border-primary/20 shadow-xs'
                  : 'bg-muted/5 border-transparent hover:border-border/30 hover:bg-muted/10',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-black uppercase tracking-wider',
                      isSelected ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    Versi {version.version}
                  </span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>

                {isActive && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md">
                    Aktif
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">
                <Clock size={10} />
                {new Date(version.createdAt).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>

              {/* Optional User Notes */}
              {version.userNotes && (
                <p className="text-[10px] font-medium text-muted-foreground line-clamp-2 mt-1 italic border-l-2 border-border/20 pl-2">
                  &ldquo;{version.userNotes}&rdquo;
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
