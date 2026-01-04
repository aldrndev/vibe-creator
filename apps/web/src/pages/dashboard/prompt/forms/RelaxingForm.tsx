import { Card, CardBody, Select, SelectItem } from "@heroui/react";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { RelaxingFormData } from "../types";
import {
  environments,
  primarySounds,
  secondarySounds,
  relaxingDurations,
  relaxingMoods,
  visualStyles,
} from "../constants";
import { TargetModelSelector } from "../components/TargetModelSelector";

interface RelaxingFormProps {
  data: RelaxingFormData;
  onChange: (data: RelaxingFormData) => void;
}

export function RelaxingForm({ data, onChange }: RelaxingFormProps) {
  const handleChange = (key: keyof RelaxingFormData, value: any) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card>
      <CardBody className="p-4 space-y-6">
        <TargetModelSelector
          promptType="RELAXING"
          value={data.targetModel}
          onChange={(v) => handleChange("targetModel", v)}
        />
        <h3 className="font-medium">Detail Relaxing/Ambient</h3>

        <Select
          label="Environment"
          selectedKeys={[data.environment]}
          onChange={(e) => handleChange("environment", e.target.value)}
        >
          {environments.map((e) => (
            <SelectItem key={e.key}>{e.label}</SelectItem>
          ))}
        </Select>

        <SelectionGrid
          label="Suara Utama"
          options={primarySounds}
          value={data.primarySound}
          onChange={(v) => handleChange("primarySound", v)}
          columns={4}
        />

        <SelectionGrid
          label="Suara Sekunder"
          options={secondarySounds}
          value={data.secondarySounds}
          onChange={(v) => handleChange("secondarySounds", v)}
          columns={4}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Durasi"
            selectedKeys={[data.duration]}
            onChange={(e) => handleChange("duration", e.target.value)}
          >
            {relaxingDurations.map((d) => (
              <SelectItem key={d.key}>{d.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Mood"
            selectedKeys={[data.mood]}
            onChange={(e) => handleChange("mood", e.target.value)}
          >
            {relaxingMoods.map((m) => (
              <SelectItem key={m.key}>{m.label}</SelectItem>
            ))}
          </Select>
        </div>

        <SelectionGrid
          label="Visual Style (untuk video)"
          options={visualStyles}
          value={data.visualStyle}
          onChange={(v) => handleChange("visualStyle", v)}
          columns={3}
        />
      </CardBody>
    </Card>
  );
}
