import { Card, CardBody } from "@heroui/react";
import { PromptType } from "@vibe-creator/shared";
import { promptTypes } from "../constants";

interface PromptTypeSelectorProps {
  selectedType: PromptType;
  onSelect: (type: PromptType) => void;
}

export function PromptTypeSelector({
  selectedType,
  onSelect,
}: PromptTypeSelectorProps) {
  return (
    <Card>
      <CardBody className="p-4 space-y-4">
        <h3 className="font-medium">Tipe Prompt</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {promptTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.key}
                onClick={() => onSelect(type.key as PromptType)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedType === type.key
                    ? "border-primary bg-primary/10"
                    : "border-divider hover:border-primary/50"
                }`}
              >
                <Icon size={18} className="mb-2 text-primary" />
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-foreground/60 mt-1">
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
