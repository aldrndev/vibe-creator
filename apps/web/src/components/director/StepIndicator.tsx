import {
  Wand2,
  Upload,
  Scissors,
  Captions,
  Download,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@heroui/react";
import { useDirectorStore, DirectorStep } from "@/stores/director-store";

export const StepIndicator = () => {
  const { step } = useDirectorStore();

  const steps: {
    id: DirectorStep;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }[] = [
    { id: "IMPORT", label: "Import", icon: Upload },
    { id: "ANALYZING", label: "Analyze", icon: Wand2 },
    { id: "PICKING", label: "Pick Clips", icon: Scissors },
    { id: "EDITING", label: "Refine", icon: Captions },
    { id: "EXPORTING", label: "Export", icon: Download },
  ];

  const currentIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 px-4">
      <div className="relative flex justify-between items-center">
        {/* Progress Line */}
        <div className="absolute left-0 top-5 w-full h-1 bg-zinc-800 z-0 rounded-full" />
        <div
          className="absolute left-0 top-5 h-1 bg-gradient-to-r from-primary to-secondary z-0 rounded-full transition-all duration-500"
          style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((s, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;

          return (
            <div
              key={s.id}
              className="flex flex-col items-center gap-2 relative z-10"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-zinc-950",
                  isActive
                    ? "border-primary text-primary shadow-lg shadow-primary/20 scale-110"
                    : isCompleted
                    ? "border-primary bg-primary text-white"
                    : "border-zinc-700 text-zinc-500"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <s.icon size={20} />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : isCompleted
                    ? "text-zinc-300"
                    : "text-zinc-600"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
