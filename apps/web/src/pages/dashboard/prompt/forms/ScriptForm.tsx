import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { ScriptFormData } from "../types";
import { TargetModelSelector } from "../components/TargetModelSelector";
import {
  niches,
  targetAudiences,
  platforms,
  durations,
  tones,
  contentGoals,
  narrativeStyles,
  keyMessages,
  callToActions,
} from "../constants";

interface ScriptFormProps {
  data: ScriptFormData;
  onChange: (data: ScriptFormData) => void;
}

export function ScriptForm({ data, onChange }: ScriptFormProps) {
  const handleChange = (
    key: keyof ScriptFormData,
    value: ScriptFormData[keyof ScriptFormData]
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card>
      <CardBody className="p-4 space-y-6">
        <TargetModelSelector
          promptType="SCRIPT"
          value={data.targetModel}
          onChange={(v) => handleChange("targetModel", v)}
        />
        <h3 className="font-medium">Detail Script & Ide</h3>

        <SelectionGrid
          label="Niche / Topik"
          options={niches}
          value={data.niche}
          onChange={(v) => handleChange("niche", v)}
          columns={5}
        />

        <SelectionGrid
          label="Target Audiens"
          options={targetAudiences}
          value={data.targetAudience}
          onChange={(v) => handleChange("targetAudience", v)}
          columns={4}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Platform"
            selectedKeys={[data.platform]}
            onChange={(e) => handleChange("platform", e.target.value)}
          >
            {platforms.map((p) => (
              <SelectItem key={p.key}>{p.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Durasi"
            selectedKeys={[data.duration]}
            onChange={(e) => handleChange("duration", e.target.value)}
          >
            {durations.map((d) => (
              <SelectItem key={d.key}>{d.label}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Tone"
            selectedKeys={[data.tone]}
            onChange={(e) => handleChange("tone", e.target.value)}
          >
            {tones.map((t) => (
              <SelectItem key={t.key}>{t.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Goal Konten"
            selectedKeys={[data.contentGoal]}
            onChange={(e) => handleChange("contentGoal", e.target.value)}
          >
            {contentGoals.map((g) => (
              <SelectItem key={g.key}>{g.label}</SelectItem>
            ))}
          </Select>
        </div>

        <Select
          label="Gaya Narasi"
          selectedKeys={[data.narrativeStyle]}
          onChange={(e) => handleChange("narrativeStyle", e.target.value)}
        >
          {narrativeStyles.map((n) => (
            <SelectItem key={n.key}>{n.label}</SelectItem>
          ))}
        </Select>

        <SelectionGrid
          label="Pesan Utama"
          options={keyMessages}
          value={data.keyMessage}
          onChange={(v) => handleChange("keyMessage", v)}
          columns={5}
        />

        <SelectionGrid
          label="Call to Action"
          options={callToActions}
          value={data.callToAction}
          onChange={(v) => handleChange("callToAction", v)}
          columns={5}
        />

        <Input
          label="Keywords (pisahkan dengan koma)"
          placeholder="Contoh: iPhone, Apple, smartphone, review"
          value={data.keywords}
          onValueChange={(v) => handleChange("keywords", v)}
        />

        <Textarea
          label="Konteks Tambahan (opsional)"
          placeholder="Informasi tambahan yang perlu diketahui..."
          value={data.additionalContext}
          onValueChange={(v) => handleChange("additionalContext", v)}
        />
      </CardBody>
    </Card>
  );
}
