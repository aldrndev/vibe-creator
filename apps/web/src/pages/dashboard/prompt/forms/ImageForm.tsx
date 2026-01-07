import { Card, CardBody, Select, SelectItem, Textarea } from "@heroui/react";
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
  imagePurposes, // Now available
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
          <Select
            label="Style"
            selectedKeys={[data.style]}
            onChange={(e) => handleChange("style", e.target.value)}
          >
            {imageStyles.map((s) => (
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
          onValueChange={(v) => handleChange("additionalDetails", v)}
        />
      </CardBody>
    </Card>
  );
}
