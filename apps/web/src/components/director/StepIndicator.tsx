import { Captions, CheckCircle2, Scissors, Upload, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type DirectorStep, useDirectorStore } from '@/stores/director-store';

export const StepIndicator = () => {
  const { step } = useDirectorStore();

  const steps: {
    id: DirectorStep;
    label: string;
    icon: React.ComponentType<{
      size?: number;
      className?: string;
      strokeWidth?: number;
    }>;
  }[] = [
    { id: 'IMPORT', label: 'Impor', icon: Upload },
    { id: 'ANALYZING', label: 'Analisis', icon: Wand2 },
    { id: 'PICKING', label: 'Pilih', icon: Scissors },
    { id: 'EDITING', label: 'Edit & Export', icon: Captions },
  ];

  const rawIdx = steps.findIndex((s) => s.id === step);
  const currentIdx = rawIdx >= 0 ? rawIdx : steps.findIndex((s) => s.id === 'EDITING');
  const lineInsetPercent = 100 / (steps.length * 2);

  return (
    <div className="w-full mx-auto mb-5 px-2 py-2">
      <div className="relative grid max-w-2xl grid-cols-4 items-start mx-auto">
        <div
          className="absolute top-5 z-0 -translate-y-1/2 sm:top-6"
          style={{
            left: `${lineInsetPercent}%`,
            right: `${lineInsetPercent}%`,
          }}
        >
          {/* Progress Line - Base */}
          <div className="h-0.5 rounded-full bg-border" />

          {/* Progress Line - Active Filling */}
          <div
            className="absolute inset-y-0 left-0 h-0.5 rounded-full bg-linear-to-r from-primary via-orange-500 to-rose-600 transition-all duration-700 ease-in-out"
            style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((s, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;

          let stateClasses = 'border-border/50 bg-background text-muted-foreground';
          if (isActive) stateClasses = 'border-primary bg-card text-primary scale-110 z-20';
          else if (isCompleted) stateClasses = 'border-primary bg-primary text-white scale-95';

          let labelClasses = 'text-muted-foreground/40';
          if (isActive) labelClasses = 'text-primary translate-y-1';
          else if (isCompleted) labelClasses = 'text-foreground/60';

          let dotClasses = 'bg-muted-foreground/20';
          if (isActive) dotClasses = 'bg-primary scale-150';
          else if (isCompleted) dotClasses = 'bg-primary/60';

          return (
            <div key={s.id} className="flex flex-col items-center gap-3 relative z-10">
              <div
                className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl flex items-center justify-center border-2 transition-all duration-500',
                  stateClasses,
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 size={24} strokeWidth={2.5} />
                ) : (
                  <s.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                )}
              </div>
              <span
                className={cn(
                  'hidden sm:block text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 text-center leading-none',
                  labelClasses,
                )}
              >
                {s.label}
              </span>
              {/* Mobile Mobile Identifier Dot */}
              <div
                className={cn(
                  'sm:hidden w-1.5 h-1.5 rounded-full transition-all duration-500',
                  dotClasses,
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
