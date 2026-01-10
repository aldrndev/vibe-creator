import {
  Card,
  CardBody,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
} from "@/components/ui";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { VoiceFormData } from "../types";
import {
  voiceStyles,
  languages,
  genders,
  paces,
  emotions,
  emphasisOptions,
  pauseOptions,
} from "../constants";
import { TargetModelSelector } from "../components/TargetModelSelector";

interface VoiceFormProps {
  data: VoiceFormData;
  onChange: (data: VoiceFormData) => void;
}

export function VoiceForm({ data, onChange }: VoiceFormProps) {
  const handleChange = (
    key: keyof VoiceFormData,
    value: VoiceFormData[keyof VoiceFormData]
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card>
      <CardBody className="p-4 space-y-6">
        <TargetModelSelector
          promptType="VOICE"
          value={data.targetModel}
          onChange={(v) => handleChange("targetModel", v)}
        />
        <h3 className="font-medium">Detail Voice/TTS</h3>

        <Textarea
          label="Script/Teks yang Dibacakan"
          placeholder="Masukkan script yang akan dijadikan voice-over..."
          rows={4}
          value={data.script}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange("script", e.target.value)
          }
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Gaya Suara</label>
            <Select
              value={data.voiceStyle}
              onValueChange={(v) => handleChange("voiceStyle", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voiceStyles.map((v) => (
                  <SelectItem key={v.key} value={v.key}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Bahasa</label>
            <Select
              value={data.language}
              onValueChange={(v) => handleChange("language", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.key} value={l.key}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Gender</label>
            <Select
              value={data.gender}
              onValueChange={(v) => handleChange("gender", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {genders.map((g) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Kecepatan</label>
            <Select
              value={data.pace}
              onValueChange={(v) => handleChange("pace", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paces.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SelectionGrid
          label="Emosi"
          options={emotions}
          value={data.emotion}
          onChange={(v) => handleChange("emotion", v)}
          columns={5}
        />

        <SelectionGrid
          label="Penekanan"
          options={emphasisOptions}
          value={data.emphasis}
          onChange={(v) => handleChange("emphasis", v)}
          columns={4}
        />

        <SelectionGrid
          label="Jeda/Pause"
          options={pauseOptions}
          value={data.pauses}
          onChange={(v) => handleChange("pauses", v)}
          columns={5}
        />
      </CardBody>
    </Card>
  );
}
