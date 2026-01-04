import { Card, CardBody, Select, SelectItem, Textarea } from "@heroui/react";
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
  const handleChange = (key: keyof VoiceFormData, value: any) => {
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
          minRows={4}
          value={data.script}
          onValueChange={(v) => handleChange("script", v)}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Gaya Suara"
            selectedKeys={[data.voiceStyle]}
            onChange={(e) => handleChange("voiceStyle", e.target.value)}
          >
            {voiceStyles.map((v) => (
              <SelectItem key={v.key}>{v.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Bahasa"
            selectedKeys={[data.language]}
            onChange={(e) => handleChange("language", e.target.value)}
          >
            {languages.map((l) => (
              <SelectItem key={l.key}>{l.label}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Gender"
            selectedKeys={[data.gender]}
            onChange={(e) => handleChange("gender", e.target.value)}
          >
            {genders.map((g) => (
              <SelectItem key={g.key}>{g.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Kecepatan"
            selectedKeys={[data.pace]}
            onChange={(e) => handleChange("pace", e.target.value)}
          >
            {paces.map((p) => (
              <SelectItem key={p.key}>{p.label}</SelectItem>
            ))}
          </Select>
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
