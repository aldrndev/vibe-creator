import { Card, CardBody, Input, Select, SelectItem, Chip } from "@heroui/react";
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
        <Chip color="secondary" variant="flat" size="sm">
          Analisis video kompetitor
        </Chip>

        <Input
          label="URL Video"
          placeholder="Masukkan URL YouTube/TikTok/Instagram"
          value={data.sourceUrl}
          onValueChange={(v) => handleChange("sourceUrl", v)}
        />

        <Select
          label="Tipe Analisis"
          selectedKeys={[data.analysisType]}
          onChange={(e) => handleChange("analysisType", e.target.value)}
        >
          {analysisTypes.map((a) => (
            <SelectItem key={a.key}>{a.label}</SelectItem>
          ))}
        </Select>

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
