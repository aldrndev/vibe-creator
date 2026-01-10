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
  const handleChange = (
    key: keyof VideoGenFormData,
    value: VideoGenFormData[keyof VideoGenFormData]
  ) => {
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
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Style</label>
            <Select
              value={data.style}
              onValueChange={(v) => handleChange("style", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {videoStyles.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Aspect Ratio
            </label>
            <Select
              value={data.aspectRatio}
              onValueChange={(v) => handleChange("aspectRatio", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aspectRatios.map((a) => (
                  <SelectItem key={a.key} value={a.key}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              {videoDurations.map((d) => (
                <SelectItem key={d.key} value={d.key}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange("additionalDetails", e.target.value)
          }
        />
      </CardBody>
    </Card>
  );
}
