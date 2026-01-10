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
  Badge,
  Button,
} from "@/components/ui";
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
  const handleChange = (
    key: keyof TimelapseFormData,
    value: TimelapseFormData[keyof TimelapseFormData]
  ) => {
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
        <Badge variant="secondary">
          Sora AI: max 15s single / 25s storyboard
        </Badge>

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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange("subject", e.target.value)
          }
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
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Mode</label>
            <Select
              value={data.mode}
              onValueChange={(v) => {
                const mode = v as "single" | "storyboard";
                onChange({
                  ...data,
                  mode,
                  totalDurationSeconds: mode === "single" ? 15 : 25,
                  scenes: [],
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Video (max 15s)</SelectItem>
                <SelectItem value="storyboard">Storyboard (max 25s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Total Durasi
            </label>
            <Select
              value={String(data.totalDurationSeconds)}
              onValueChange={(v) => {
                onChange({
                  ...data,
                  totalDurationSeconds: Number(v),
                  scenes: [],
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.mode === "single" ? (
                  <>
                    <SelectItem value="5">5 detik</SelectItem>
                    <SelectItem value="10">10 detik</SelectItem>
                    <SelectItem value="15">15 detik</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="15">15 detik</SelectItem>
                    <SelectItem value="20">20 detik</SelectItem>
                    <SelectItem value="25">25 detik</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {data.mode === "storyboard" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Scenes (min 2, max 8)
              </label>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    remainingSeconds === 0
                      ? "default"
                      : remainingSeconds < 0
                      ? "destructive"
                      : "outline"
                  }
                >
                  Sisa: {remainingSeconds}s
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={addScene}
                  disabled={data.scenes.length >= 8 || remainingSeconds <= 0}
                >
                  + Scene
                </Button>
              </div>
            </div>

            {data.scenes.map((scene, index) => (
              <div
                key={index}
                className="flex gap-2 items-start p-3 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <Input
                    label={`Scene ${index + 1}`}
                    placeholder="Deskripsi scene..."
                    value={scene.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateScene(index, "description", e.target.value)
                    }
                    maxLength={300}
                  />
                </div>
                <div className="w-24 space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Durasi
                  </label>
                  <Select
                    value={String(scene.durationSeconds)}
                    onValueChange={(v) =>
                      updateScene(index, "durationSeconds", Number(v))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 7, 8].map((d) => (
                        <SelectItem key={String(d)} value={String(d)}>
                          {d}s
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeScene(index)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Speed Multiplier
            </label>
            <Select
              value={String(data.speedMultiplier)}
              onValueChange={(v) => handleChange("speedMultiplier", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timelapseSpeeds.map((s) => (
                  <SelectItem key={String(s.key)} value={String(s.key)}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                {timelapseStyles.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Kamera</label>
            <Select
              value={data.camera}
              onValueChange={(v) => handleChange("camera", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timelapseCameras.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
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

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Lighting</label>
            <Select
              value={data.lighting}
              onValueChange={(v) => handleChange("lighting", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timelapseLightings.map((l) => (
                  <SelectItem key={l.key} value={l.key}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Textarea
          label="Detail Tambahan (opsional)"
          placeholder="Detail spesifik lainnya..."
          value={data.additionalDetails}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange("additionalDetails", e.target.value)
          }
          maxLength={1000}
        />
      </CardBody>
    </Card>
  );
}
