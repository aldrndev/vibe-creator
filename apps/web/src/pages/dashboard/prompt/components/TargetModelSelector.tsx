import { Select, SelectItem } from "@heroui/react";
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
    <div className="bg-content2/50 p-4 rounded-xl border border-divider/50 mb-6">
      <Select
        label="Target AI Model / Model AI"
        placeholder="Select AI Model / Pilih Model AI"
        selectedKeys={[value]}
        onChange={(e) => onChange(e.target.value as AIModel)}
        description="Kami akan mengoptimalkan sintaks prompt secara khusus untuk model ini."
        color="primary"
        variant="bordered"
        disallowEmptySelection
      >
        {models.map((model) => (
          <SelectItem key={model.id} textValue={model.label}>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{model.label}</span>
              <span className="text-xs text-foreground/50">
                {model.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
