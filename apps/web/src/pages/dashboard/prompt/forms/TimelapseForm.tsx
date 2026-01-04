import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Textarea,
  Chip,
  Button,
} from "@heroui/react";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { TimelapseFormData } from "../types";
import {
  timelapseCategories,
  timelapseTransformations,
  timelapseSpeeds,
  timelapseStyles,
  timelapseCameras,
  timelapseLightings,
  aspectRatios,
} from "../constants";
import { TargetModelSelector } from "../components/TargetModelSelector";

interface TimelapseFormProps {
  data: TimelapseFormData;
  onChange: (data: TimelapseFormData) => void;
}

export function TimelapseForm({ data, onChange }: TimelapseFormProps) {
  const handleChange = (key: keyof TimelapseFormData, value: any) => {
    onChange({ ...data, [key]: value });
  };

  const remainingSeconds =
    data.mode === "storyboard"
      ? data.totalDurationSeconds -
        data.scenes.reduce((sum, s) => sum + s.durationSeconds, 0)
      : 0;

  const addScene = () => {
    if (data.scenes.length >= 8) return;
    const defaultDuration = Math.min(5, remainingSeconds || 5);
    handleChange("scenes", [
      ...data.scenes,
      { description: "", durationSeconds: defaultDuration },
    ]);
  };

  const removeScene = (index: number) => {
    handleChange(
      "scenes",
      data.scenes.filter((_, i) => i !== index)
    );
  };

  const updateScene = (
    index: number,
    field: "description" | "durationSeconds",
    value: string | number
  ) => {
    handleChange(
      "scenes",
      data.scenes.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  return (
    <Card>
      <CardBody className="p-4 space-y-6">
        <TargetModelSelector
          promptType="TIMELAPSE"
          value={data.targetModel}
          onChange={(v) => handleChange("targetModel", v)}
        />
        <h3 className="font-medium">Detail Timelapse / Sora</h3>
        <Chip color="secondary" variant="flat" size="sm">
          Sora AI: max 15s single / 25s storyboard
        </Chip>

        <SelectionGrid
          label="Kategori"
          options={timelapseCategories}
          value={data.category}
          onChange={(v) => handleChange("category", v)}
          columns={4}
        />

        <Input
          label="Subject"
          placeholder="Deskripsi objek/scene yang akan di-timelapse"
          value={data.subject}
          onValueChange={(v) => handleChange("subject", v)}
          maxLength={200}
        />

        <SelectionGrid
          label="Transformasi"
          options={timelapseTransformations}
          value={data.transformation}
          onChange={(v) => handleChange("transformation", v)}
          columns={4}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Mode"
            selectedKeys={[data.mode]}
            onChange={(e) => {
              const mode = e.target.value as "single" | "storyboard";
              onChange({
                ...data,
                mode,
                totalDurationSeconds: mode === "single" ? 15 : 25,
                scenes: [],
              });
            }}
          >
            <SelectItem key="single">Single Video (max 15s)</SelectItem>
            <SelectItem key="storyboard">Storyboard (max 25s)</SelectItem>
          </Select>

          <Select
            label="Total Durasi"
            selectedKeys={[String(data.totalDurationSeconds)]}
            onChange={(e) => {
              onChange({
                ...data,
                totalDurationSeconds: Number(e.target.value),
                scenes: [],
              });
            }}
          >
            {data.mode === "single" ? (
              <>
                <SelectItem key="5" textValue="5 detik">
                  5 detik
                </SelectItem>
                <SelectItem key="10" textValue="10 detik">
                  10 detik
                </SelectItem>
                <SelectItem key="15" textValue="15 detik">
                  15 detik
                </SelectItem>
              </>
            ) : (
              <>
                <SelectItem key="15" textValue="15 detik">
                  15 detik
                </SelectItem>
                <SelectItem key="20" textValue="20 detik">
                  20 detik
                </SelectItem>
                <SelectItem key="25" textValue="25 detik">
                  25 detik
                </SelectItem>
              </>
            )}
          </Select>
        </div>

        {data.mode === "storyboard" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Scenes (min 2, max 8)
              </label>
              <div className="flex items-center gap-2">
                <Chip
                  size="sm"
                  color={
                    remainingSeconds === 0
                      ? "success"
                      : remainingSeconds < 0
                      ? "danger"
                      : "warning"
                  }
                >
                  Sisa: {remainingSeconds}s
                </Chip>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={addScene}
                  isDisabled={data.scenes.length >= 8 || remainingSeconds <= 0}
                >
                  + Scene
                </Button>
              </div>
            </div>

            {data.scenes.map((scene, index) => (
              <div
                key={index}
                className="flex gap-2 items-start p-3 bg-content2 rounded-lg"
              >
                <div className="flex-1">
                  <Input
                    size="sm"
                    label={`Scene ${index + 1}`}
                    placeholder="Deskripsi scene..."
                    value={scene.description}
                    onValueChange={(v) => updateScene(index, "description", v)}
                    maxLength={300}
                  />
                </div>
                <Select
                  size="sm"
                  label="Durasi"
                  className="w-24"
                  selectedKeys={[String(scene.durationSeconds)]}
                  onChange={(e) =>
                    updateScene(
                      index,
                      "durationSeconds",
                      Number(e.target.value)
                    )
                  }
                >
                  {[3, 4, 5, 6, 7, 8].map((d) => (
                    <SelectItem key={String(d)} textValue={`${d}s`}>
                      {d}s
                    </SelectItem>
                  ))}
                </Select>
                <Button
                  size="sm"
                  isIconOnly
                  variant="light"
                  color="danger"
                  onPress={() => removeScene(index)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Speed Multiplier"
            selectedKeys={[String(data.speedMultiplier)]}
            onChange={(e) =>
              handleChange("speedMultiplier", Number(e.target.value))
            }
          >
            {timelapseSpeeds.map((s) => (
              <SelectItem key={String(s.key)}>{s.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Style"
            selectedKeys={[data.style]}
            onChange={(e) => handleChange("style", e.target.value)}
          >
            {timelapseStyles.map((s) => (
              <SelectItem key={s.key}>{s.label}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Select
            label="Kamera"
            selectedKeys={[data.camera]}
            onChange={(e) => handleChange("camera", e.target.value)}
          >
            {timelapseCameras.map((c) => (
              <SelectItem key={c.key}>{c.label}</SelectItem>
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

          <Select
            label="Lighting"
            selectedKeys={[data.lighting]}
            onChange={(e) => handleChange("lighting", e.target.value)}
          >
            {timelapseLightings.map((l) => (
              <SelectItem key={l.key}>{l.label}</SelectItem>
            ))}
          </Select>
        </div>

        <Textarea
          label="Detail Tambahan (opsional)"
          placeholder="Detail spesifik lainnya..."
          value={data.additionalDetails}
          onValueChange={(v) => handleChange("additionalDetails", v)}
          maxLength={1000}
        />
      </CardBody>
    </Card>
  );
}
