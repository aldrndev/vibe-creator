import {
  Card,
  CardBody,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
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
  const handleChange = (
    key: keyof RelaxingFormData,
    value: RelaxingFormData[keyof RelaxingFormData]
  ) => {
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

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Environment</label>
          <Select
            value={data.environment}
            onValueChange={(v) => handleChange("environment", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {environments.map((e) => (
                <SelectItem key={e.key} value={e.key}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Durasi</label>
            <Select
              value={data.duration}
              onValueChange={(v) => handleChange("duration", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {relaxingDurations.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Mood</label>
            <Select
              value={data.mood}
              onValueChange={(v) => handleChange("mood", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {relaxingMoods.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
