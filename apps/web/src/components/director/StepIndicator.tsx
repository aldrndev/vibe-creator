import {
  Wand2,
  Upload,
  Scissors,
  Captions,
  Download,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDirectorStore, DirectorStep } from "@/stores/director-store";

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
    { id: "IMPORT", label: "Impor", icon: Upload },
    { id: "ANALYZING", label: "Analisis", icon: Wand2 },
    { id: "PICKING", label: "Pilih", icon: Scissors },
    { id: "EDITING", label: "Edit", icon: Captions },
    { id: "EXPORTING", label: "Ekspor", icon: Download },
  ];

  const currentIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="w-full mx-auto mb-12">
      <div className="relative flex justify-between items-center max-w-2xl mx-auto">
        {/* Progress Line - Base */}
        <div className="absolute left-0 top-5 sm:top-6 -translate-y-1/2 w-full h-[2px] bg-border z-0 rounded-full" />

        {/* Progress Line - Active Filling */}
        <div
          className="absolute left-0 top-5 sm:top-6 -translate-y-1/2 h-[2px] bg-gradient-to-r from-primary via-orange-500 to-rose-600 z-0 rounded-full transition-all duration-700 ease-in-out"
          style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((s, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;

          return (
            <div
              key={s.id}
              className="flex flex-col items-center gap-3 relative z-10"
            >
              <div
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                  isActive
                    ? "border-primary bg-card text-primary scale-110 z-20"
                    : isCompleted
                    ? "border-primary bg-primary text-white scale-95"
                    : "border-border/50 bg-background text-muted-foreground"
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
                  "hidden sm:block text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300",
                  isActive
                    ? "text-primary translate-y-1"
                    : isCompleted
                    ? "text-foreground/60"
                    : "text-muted-foreground/40"
                )}
              >
                {s.label}
              </span>
              {/* Mobile Mobile Identifier Dot */}
              <div
                className={cn(
                  "sm:hidden w-1.5 h-1.5 rounded-full transition-all duration-500",
                  isActive
                    ? "bg-primary scale-150"
                    : isCompleted
                    ? "bg-primary/60"
                    : "bg-muted-foreground/20"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
