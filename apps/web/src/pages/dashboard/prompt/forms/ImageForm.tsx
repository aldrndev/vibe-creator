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
import { ImageFormData } from "../types";
import { TargetModelSelector } from "../components/TargetModelSelector";
import {
  imageSubjects,
  imageStyles,
  aspectRatios,
  moodOptions,
  colorOptions,
  textOverlayOptions,
  imagePurposes,
} from "../constants";

interface ImageFormProps {
  data: ImageFormData;
  onChange: (data: ImageFormData) => void;
}

export function ImageForm({ data, onChange }: ImageFormProps) {
  const handleChange = (
    key: keyof ImageFormData,
    value: ImageFormData[keyof ImageFormData]
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card>
      <CardBody className="p-4 space-y-6">
        <TargetModelSelector
          promptType="IMAGE"
          value={data.targetModel}
          onChange={(v) => handleChange("targetModel", v)}
        />
        <h3 className="font-medium">Detail Image Generation</h3>

        <SelectionGrid
          label="Tujuan / Purpose"
          options={imagePurposes}
          value={data.purpose}
          onChange={(v) => handleChange("purpose", v)}
          columns={5}
        />

        <SelectionGrid
          label="Subject/Objek"
          options={imageSubjects}
          value={data.subject}
          onChange={(v) => handleChange("subject", v)}
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
                {imageStyles.map((s) => (
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

        <SelectionGrid
          label="Mood/Suasana"
          options={moodOptions}
          value={data.mood}
          onChange={(v) => handleChange("mood", v)}
          columns={5}
        />

        <SelectionGrid
          label="Warna"
          options={colorOptions}
          value={data.colors}
          onChange={(v) => handleChange("colors", v)}
          columns={5}
        />

        <SelectionGrid
          label="Text Overlay"
          options={textOverlayOptions}
          value={data.textOverlay}
          onChange={(v) => handleChange("textOverlay", v)}
          columns={4}
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
