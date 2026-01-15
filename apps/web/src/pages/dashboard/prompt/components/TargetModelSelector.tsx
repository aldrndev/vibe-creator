import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { PromptType, AIModel, getModelsForType } from "@vibe-creator/shared";
import { Cpu } from "lucide-react";

interface TargetModelSelectorProps {
  promptType: PromptType;
  value: AIModel;
  onChange: (model: AIModel) => void;
}

export function TargetModelSelector({
  promptType,
  value,
  onChange,
}: TargetModelSelectorProps) {
  const models = getModelsForType(promptType);

  return (
    <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 mb-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Cpu size={40} className="text-primary" />
      </div>

      <div className="space-y-4 relative z-10">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-primary/80 ml-1">
            Engine Optimasi AI
          </label>
        </div>

        <Select value={value} onValueChange={(v) => onChange(v as AIModel)}>
          <SelectTrigger className="h-12 rounded-xl bg-background/50 border-primary/30 font-bold focus:ring-primary/20">
            <SelectValue placeholder="Pilih Model AI" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/50">
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col gap-0.5 py-1">
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    {model.label}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                    {model.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-[10px] font-medium text-muted-foreground/80 leading-relaxed italic ml-1">
          * Sintaks akan dioptimalkan secara presisi untuk karakteristik model{" "}
          {value}.
        </p>
      </div>
    </div>
  );
}
