import { Captions, CheckCircle2, Download, Scissors, Upload, Wand2 } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { type DirectorStep, useDirectorStore } from '@/stores/director-store';

export type DirectorVisualStepId =
  | 'SOURCE_VIDEO'
  | 'AI_ANALYSIS'
  | 'PICK_MOMENT'
  | 'EDIT_SHORT'
  | 'PREVIEW_DOWNLOAD';

interface DirectorVisualStep {
  readonly id: DirectorVisualStepId;
  readonly label: string;
  readonly icon: ComponentType<{
    readonly size?: number;
    readonly className?: string;
    readonly strokeWidth?: number;
  }>;
}

export const directorVisualSteps: readonly DirectorVisualStep[] = [
  { id: 'SOURCE_VIDEO', label: 'Pilih Video', icon: Upload },
  { id: 'AI_ANALYSIS', label: 'Analisis AI', icon: Wand2 },
  { id: 'PICK_MOMENT', label: 'Pilih Momen', icon: Scissors },
  { id: 'EDIT_SHORT', label: 'Edit Short', icon: Captions },
  { id: 'PREVIEW_DOWNLOAD', label: 'Hasil', icon: Download },
];

export function getDirectorVisualStepId(step: DirectorStep): DirectorVisualStepId {
  switch (step) {
    case 'IMPORT':
      return 'SOURCE_VIDEO';
    case 'ANALYZING':
      return 'AI_ANALYSIS';
    case 'PICKING':
      return 'PICK_MOMENT';
    case 'EDITING':
    case 'PUBLISH_COPY':
      return 'EDIT_SHORT';
    case 'EXPORTING':
    case 'COMPLETED':
      return 'PREVIEW_DOWNLOAD';
    default:
      return 'SOURCE_VIDEO';
  }
}

export function getDirectorVisualStepIndex(step: DirectorStep): number {
  const visualStepId = getDirectorVisualStepId(step);
  return Math.max(
    directorVisualSteps.findIndex((visualStep) => visualStep.id === visualStepId),
    0,
  );
}

interface DirectorStepIndicatorItemProps {
  readonly visualStep: DirectorVisualStep;
  readonly isActive: boolean;
  readonly isCompleted: boolean;
}

function getStepIconClasses(isActive: boolean, isCompleted: boolean): string {
  if (isActive) {
    return 'border-primary bg-card text-primary z-20';
  }

  if (isCompleted) {
    return 'border-primary bg-primary text-primary-foreground';
  }

  return 'border-border/60 bg-background text-muted-foreground';
}

function getStepLabelClasses(isActive: boolean, isCompleted: boolean): string {
  if (isActive) {
    return 'text-primary';
  }

  if (isCompleted) {
    return 'text-foreground/60';
  }

  return 'text-muted-foreground/40';
}

function getStepDotClasses(isActive: boolean, isCompleted: boolean): string {
  if (isActive) {
    return 'bg-primary scale-150';
  }

  if (isCompleted) {
    return 'bg-primary/60';
  }

  return 'bg-muted-foreground/20';
}

function DirectorStepIndicatorItem({
  visualStep,
  isActive,
  isCompleted,
}: DirectorStepIndicatorItemProps) {
  const Icon = visualStep.icon;

  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border text-sm transition-all duration-300 sm:h-10 sm:w-10',
          getStepIconClasses(isActive, isCompleted),
        )}
      >
        {isCompleted ? (
          <CheckCircle2 size={19} strokeWidth={2.5} />
        ) : (
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
        )}
      </div>
      <span
        className={cn(
          'hidden max-w-28 text-center text-[10px] font-black uppercase leading-tight tracking-wider transition-all duration-300 sm:block',
          getStepLabelClasses(isActive, isCompleted),
        )}
      >
        {visualStep.label}
      </span>
      <div
        className={cn(
          'sm:hidden w-1.5 h-1.5 rounded-full transition-all duration-500',
          getStepDotClasses(isActive, isCompleted),
        )}
      />
    </div>
  );
}

export const StepIndicator = () => {
  const { step } = useDirectorStore();
  const currentIdx = getDirectorVisualStepIndex(step);
  const lineInsetPercent = 100 / (directorVisualSteps.length * 2);

  return (
    <div className="mx-auto mb-3 w-full px-2 py-1">
      <div className="relative mx-auto grid max-w-3xl grid-cols-5 items-start">
        <div
          className="absolute top-4 z-0 -translate-y-1/2 sm:top-5"
          style={{
            left: `${lineInsetPercent}%`,
            right: `${lineInsetPercent}%`,
          }}
        >
          <div className="h-0.5 rounded-full bg-border" />
          <div
            className="absolute inset-y-0 left-0 h-0.5 rounded-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${(currentIdx / (directorVisualSteps.length - 1)) * 100}%` }}
          />
        </div>

        {directorVisualSteps.map((s, idx) => {
          return (
            <DirectorStepIndicatorItem
              key={s.id}
              visualStep={s}
              isActive={idx === currentIdx}
              isCompleted={idx < currentIdx}
            />
          );
        })}
      </div>
    </div>
  );
};
