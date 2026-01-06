import { useState } from "react";
import { Button, Input, Card, CardBody } from "@heroui/react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreatePrompt } from "@/hooks/use-prompts";
import { PromptType } from "@vibe-creator/shared";

// Modular Components & Types
import {
  ScriptFormData,
  VoiceFormData,
  VideoGenFormData,
  ImageFormData,
  RelaxingFormData,
  CreativeScanFormData,
  TimelapseFormData,
  defaultScriptForm,
  defaultVoiceForm,
  defaultVideoGenForm,
  defaultImageForm,
  defaultRelaxingForm,
  defaultCreativeScanForm,
  defaultTimelapseForm,
} from "./prompt/types";

import { PromptTypeSelector } from "./prompt/components/PromptTypeSelector";
import { PromptResultDisplay } from "./prompt/components/PromptResultDisplay";

import { ScriptForm } from "./prompt/forms/ScriptForm";
import { VoiceForm } from "./prompt/forms/VoiceForm";
import { VideoGenForm } from "./prompt/forms/VideoGenForm";
import { ImageForm } from "./prompt/forms/ImageForm";
import { RelaxingForm } from "./prompt/forms/RelaxingForm";
import { CreativeScanForm } from "./prompt/forms/CreativeScanForm";
import { TimelapseForm } from "./prompt/forms/TimelapseForm";

export function PromptBuilderPage() {
  const navigate = useNavigate();
  const createPrompt = useCreatePrompt();

  // State
  const [selectedType, setSelectedType] = useState<PromptType>("SCRIPT");
  const [title, setTitle] = useState("");

  // Forms State
  const [scriptForm, setScriptForm] =
    useState<ScriptFormData>(defaultScriptForm);
  const [voiceForm, setVoiceForm] = useState<VoiceFormData>(defaultVoiceForm);
  const [videoGenForm, setVideoGenForm] =
    useState<VideoGenFormData>(defaultVideoGenForm);
  const [imageForm, setImageForm] = useState<ImageFormData>(defaultImageForm);
  const [relaxingForm, setRelaxingForm] =
    useState<RelaxingFormData>(defaultRelaxingForm);
  const [creativeScanForm, setCreativeScanForm] =
    useState<CreativeScanFormData>(defaultCreativeScanForm);
  const [timelapseForm, setTimelapseForm] =
    useState<TimelapseFormData>(defaultTimelapseForm);

  const handleGenerate = () => {
    let inputData:
      | ScriptFormData
      | VoiceFormData
      | VideoGenFormData
      | ImageFormData
      | RelaxingFormData
      | CreativeScanFormData
      | TimelapseFormData;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    switch (selectedType) {
      case "SCRIPT": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formData: any = { ...scriptForm };
        // Transform comma-separated strings to arrays
        if (typeof formData.keywords === "string") {
          formData.keywords = formData.keywords
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        if (typeof formData.emotionalJourney === "string") {
          formData.emotionalJourney = formData.emotionalJourney
            .split(/,|->/)
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        inputData = formData;
        break;
      }
      case "VOICE": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formData: any = { ...voiceForm };
        if (typeof formData.emphasis === "string") {
          formData.emphasis = formData.emphasis
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        if (typeof formData.pauses === "string") {
          formData.pauses = formData.pauses
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        inputData = formData;
        break;
      }
      case "VIDEO_GEN":
        inputData = videoGenForm;
        break;
      case "IMAGE": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formData: any = { ...imageForm };
        if (typeof formData.colors === "string") {
          formData.colors = formData.colors
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        inputData = formData;
        break;
      }
      case "RELAXING": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formData: any = { ...relaxingForm };
        if (typeof formData.secondarySounds === "string") {
          formData.secondarySounds = formData.secondarySounds
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        if (typeof formData.ambientDetails === "string") {
          formData.ambientDetails = formData.ambientDetails
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        inputData = formData;
        break;
      }
      case "CREATIVE_SCAN":
        inputData = creativeScanForm;
        break;
      case "TIMELAPSE":
        inputData = timelapseForm;
        break;
    }

    const payload = {
      type: selectedType,
      title: title || `${selectedType} Prompt - ${new Date().toLocaleString()}`,
      inputData: inputData as unknown as Record<string, unknown>,
    };

    // Mutation handles success/error - result displayed in PromptResultDisplay
    // Error state can be shown via createPrompt.isError and createPrompt.error
    createPrompt.mutate(payload);
  };

  const renderCurrentForm = () => {
    switch (selectedType) {
      case "SCRIPT":
        return <ScriptForm data={scriptForm} onChange={setScriptForm} />;
      case "VOICE":
        return <VoiceForm data={voiceForm} onChange={setVoiceForm} />;
      case "VIDEO_GEN":
        return <VideoGenForm data={videoGenForm} onChange={setVideoGenForm} />;
      case "IMAGE":
        return <ImageForm data={imageForm} onChange={setImageForm} />;
      case "RELAXING":
        return <RelaxingForm data={relaxingForm} onChange={setRelaxingForm} />;
      case "CREATIVE_SCAN":
        return (
          <CreativeScanForm
            data={creativeScanForm}
            onChange={setCreativeScanForm}
          />
        );
      case "TIMELAPSE":
        return (
          <TimelapseForm data={timelapseForm} onChange={setTimelapseForm} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="light"
          onPress={() => navigate("/dashboard/prompts")}
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Prompt Builder</h1>
          <p className="text-foreground/60">Buat prompt untuk konten kamu</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left - Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <PromptTypeSelector
            selectedType={selectedType}
            onSelect={setSelectedType}
          />

          <Card>
            <CardBody className="p-4">
              <Input
                label="Judul Prompt"
                placeholder="Contoh: Script Review iPhone 16"
                value={title}
                onValueChange={setTitle}
              />
            </CardBody>
          </Card>

          {renderCurrentForm()}

          <Button
            color="primary"
            size="lg"
            fullWidth
            startContent={<Sparkles size={20} />}
            onPress={handleGenerate}
            isLoading={createPrompt.isPending}
          >
            Generate Prompt
          </Button>
        </motion.div>

        {/* Right - Result */}
        <PromptResultDisplay
          generatedPrompt={createPrompt.data?.generatedPrompt || null}
        />
      </div>
    </div>
  );
}
