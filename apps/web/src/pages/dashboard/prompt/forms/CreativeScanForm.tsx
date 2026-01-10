import {
  Card,
  CardBody,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from "@/components/ui";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { CreativeScanFormData } from "../types";
import { analysisTypes, niches, focusAreas } from "../constants";
import { TargetModelSelector } from "../components/TargetModelSelector";

interface CreativeScanFormProps {
  data: CreativeScanFormData;
  onChange: (data: CreativeScanFormData) => void;
}

export function CreativeScanForm({ data, onChange }: CreativeScanFormProps) {
  const handleChange = (
    key: keyof CreativeScanFormData,
    value: CreativeScanFormData[keyof CreativeScanFormData]
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card>
      <CardBody className="p-4 space-y-6">
        <TargetModelSelector
          promptType="CREATIVE_SCAN"
          value={data.targetModel}
          onChange={(v) => handleChange("targetModel", v)}
        />
        <h3 className="font-medium">Detail Creative Scan</h3>
        <Badge variant="secondary">Analisis video kompetitor</Badge>

        <Input
          label="URL Video"
          placeholder="Masukkan URL YouTube/TikTok/Instagram"
          value={data.sourceUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange("sourceUrl", e.target.value)
          }
        />

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Tipe Analisis</label>
          <Select
            value={data.analysisType}
            onValueChange={(v) => handleChange("analysisType", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {analysisTypes.map((a) => (
                <SelectItem key={a.key} value={a.key}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SelectionGrid
          label="Niche"
          options={niches}
          value={data.niche}
          onChange={(v) => handleChange("niche", v)}
          columns={5}
        />

        <SelectionGrid
          label="Fokus Analisis"
          options={focusAreas}
          value={data.focusAreas}
          onChange={(v) => handleChange("focusAreas", v)}
          columns={3}
        />
      </CardBody>
    </Card>
  );
}
