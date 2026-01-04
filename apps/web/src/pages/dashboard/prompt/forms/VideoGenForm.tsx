import { Card, CardBody, Select, SelectItem, Textarea } from "@heroui/react";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { VideoGenFormData } from "../types";
import { TargetModelSelector } from "../components/TargetModelSelector";
import {
  videoStyles,
  aspectRatios,
  videoDurations,
  cameraMovements,
  lightingOptions,
  moodOptions,
} from "../constants";

interface VideoGenFormProps {
  data: VideoGenFormData;
  onChange: (data: VideoGenFormData) => void;
}

export function VideoGenForm({ data, onChange }: VideoGenFormProps) {
  const handleChange = (key: keyof VideoGenFormData, value: any) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card>
      <CardBody className="p-4 space-y-6">
        <TargetModelSelector
          promptType="VIDEO_GEN"
          value={data.targetModel}
          onChange={(v) => handleChange("targetModel", v)}
        />
        <h3 className="font-medium">Detail Video Generation</h3>

        <SelectionGrid
          label="Konsep Video"
          options={videoStyles}
          value={data.concept}
          onChange={(v) => handleChange("concept", v)}
          columns={5}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Style"
            selectedKeys={[data.style]}
            onChange={(e) => handleChange("style", e.target.value)}
          >
            {videoStyles.map((s) => (
              <SelectItem key={s.key}>{s.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Aspect Ratio"
            selectedKeys={[data.aspectRatio]}
            onChange={(e) => handleChange("aspectRatio", e.target.value)}
          >
            {aspectRatios.map((a) => (
              <SelectItem key={a.key}>{a.label}</SelectItem>
            ))}
          </Select>
        </div>

        <Select
          label="Durasi"
          selectedKeys={[data.duration]}
          onChange={(e) => handleChange("duration", e.target.value)}
        >
          {videoDurations.map((d) => (
            <SelectItem key={d.key}>{d.label}</SelectItem>
          ))}
        </Select>

        <SelectionGrid
          label="Camera Movement"
          options={cameraMovements}
          value={data.movement}
          onChange={(v) => handleChange("movement", v)}
          columns={5}
        />

        <SelectionGrid
          label="Lighting"
          options={lightingOptions}
          value={data.lighting}
          onChange={(v) => handleChange("lighting", v)}
          columns={5}
        />

        <SelectionGrid
          label="Mood"
          options={moodOptions}
          value={data.mood}
          onChange={(v) => handleChange("mood", v)}
          columns={5}
        />

        <Textarea
          label="Detail Tambahan (opsional)"
          placeholder="Detail spesifik lainnya..."
          value={data.additionalDetails}
          onValueChange={(v) => handleChange("additionalDetails", v)}
        />
      </CardBody>
    </Card>
  );
}
