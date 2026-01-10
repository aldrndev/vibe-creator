import {
  Card,
  CardBody,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
} from "@/components/ui";
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
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Platform</label>
            <Select
              value={data.platform}
              onValueChange={(v) => handleChange("platform", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                {durations.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Tone</label>
            <Select
              value={data.tone}
              onValueChange={(v) => handleChange("tone", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tones.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Goal Konten</label>
            <Select
              value={data.contentGoal}
              onValueChange={(v) => handleChange("contentGoal", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contentGoals.map((g) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Gaya Narasi</label>
          <Select
            value={data.narrativeStyle}
            onValueChange={(v) => handleChange("narrativeStyle", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {narrativeStyles.map((n) => (
                <SelectItem key={n.key} value={n.key}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange("keywords", e.target.value)
          }
        />

        <Textarea
          label="Konteks Tambahan (opsional)"
          placeholder="Informasi tambahan yang perlu diketahui..."
          value={data.additionalContext}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange("additionalContext", e.target.value)
          }
        />
      </CardBody>
    </Card>
  );
}
