import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { PromptType, AIModel, getModelsForType } from "@vibe-creator/shared";

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
    <div className="bg-muted/50 p-4 rounded-xl border border-border/50 mb-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Target AI Model / Model AI
        </label>
        <Select value={value} onValueChange={(v) => onChange(v as AIModel)}>
          <SelectTrigger className="border-primary">
            <SelectValue placeholder="Select AI Model / Pilih Model AI" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{model.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {model.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Kami akan mengoptimalkan sintaks prompt secara khusus untuk model ini.
        </p>
      </div>
    </div>
  );
}
