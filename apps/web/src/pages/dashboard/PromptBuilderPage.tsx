import { useState, useEffect } from "react";
import { Button, Input, Card, CardBody } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Check,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreatePrompt } from "@/hooks/use-prompts";
import { PromptType } from "@vibe-creator/shared";
import { cn } from "@/lib/utils";

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

import { PageTransition } from "@/components/ui/PageTransition";

type Step = "CATEGORY" | "FORM" | "RESULT";

export function PromptBuilderPage() {
  const navigate = useNavigate();
  const createPrompt = useCreatePrompt();

  // State
  const [currentStep, setCurrentStep] = useState<Step>("CATEGORY");
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

  // Auto-advance to form after category selection
  const handleTypeSelect = (type: PromptType) => {
    setSelectedType(type);
    setCurrentStep("FORM");
  };

  // Sync animation/step when result arrives
  useEffect(() => {
    if (createPrompt.isSuccess && createPrompt.data) {
      setCurrentStep("RESULT");
    }
  }, [createPrompt.isSuccess, createPrompt.data]);

  const handleGenerate = () => {
    let inputData:
      | ScriptFormData
      | VoiceFormData
      | VideoGenFormData
      | ImageFormData
      | RelaxingFormData
      | CreativeScanFormData
      | TimelapseFormData;

    switch (selectedType) {
      case "SCRIPT": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formData: any = { ...scriptForm };
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

  const steps = [
    { key: "CATEGORY", label: "Pilih Tipe" },
    { key: "FORM", label: "Konfigurasi" },
    { key: "RESULT", label: "Hasil" },
  ];

  return (
    <PageTransition className="pb-20 lg:pb-10">
      <div className="max-w-[1200px] mx-auto space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/30 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full w-10 h-10 bg-muted/20 border border-border/50"
                onClick={() => navigate("/dashboard/prompts")}
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-rose-600">
                Prompt Builder
              </h1>
            </div>
            <p className="text-muted-foreground font-black uppercase text-[10px] tracking-[0.2em] ml-14">
              Arsitektur Konten Kreatif Berbasis AI
            </p>
          </div>

          {/* Stepper Component */}
          <div className="flex items-center gap-2 bg-muted/10 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md">
            {steps.map((s, idx) => {
              const isActive = currentStep === s.key;
              const isPast =
                steps.findIndex((x) => x.key === currentStep) > idx;

              return (
                <div key={s.key} className="flex items-center">
                  <button
                    disabled={!isPast && !isActive}
                    onClick={() => setCurrentStep(s.key as Step)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                      isActive
                        ? "bg-primary text-white"
                        : isPast
                        ? "text-primary hover:bg-primary/5"
                        : "text-muted-foreground opacity-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border",
                        isActive
                          ? "bg-white text-primary border-white"
                          : isPast
                          ? "bg-primary/10 border-primary"
                          : "bg-muted/20 border-border"
                      )}
                    >
                      {isPast ? <Check size={12} strokeWidth={3} /> : idx + 1}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                      {s.label}
                    </span>
                  </button>
                  {idx < steps.length - 1 && (
                    <ChevronRight
                      size={14}
                      className="mx-1 text-muted-foreground/30"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Wizard */}
        <div className="relative min-h-[500px]">
          <AnimatePresence mode="wait">
            {currentStep === "CATEGORY" && (
              <motion.div
                key="step-category"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="max-w-4xl mx-auto"
              >
                <PromptTypeSelector
                  selectedType={selectedType}
                  onSelect={handleTypeSelect}
                />
              </motion.div>
            )}

            {currentStep === "FORM" && (
              <motion.div
                key="step-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                {/* Title Card Overlayed slightly */}
                <Card className="bg-card/70 backdrop-blur-xl border-border/50">
                  <CardBody className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h2 className="text-xl font-black tracking-tighter text-foreground">
                          Detail Konfigurasi
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Lengkapi data untuk {selectedType}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] font-black uppercase tracking-widest rounded-full border border-border/50"
                        onClick={() => setCurrentStep("CATEGORY")}
                      >
                        <RefreshCw size={12} className="mr-2" /> Ganti Tipe
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Nama / Judul Project
                      </label>
                      <Input
                        placeholder="Contoh: Script Review iPhone 16 Pro Max"
                        value={title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setTitle(e.target.value)
                        }
                        className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 text-lg focus:bg-muted/20 transition-all"
                      />
                    </div>
                  </CardBody>
                </Card>

                <div className="space-y-8">
                  {renderCurrentForm()}

                  <div className="sticky bottom-8 z-20">
                    <Button
                      size="lg"
                      className="w-full h-16 rounded-3xl font-black uppercase tracking-[0.3em] text-sm transition-all active:scale-95 bg-gradient-to-r from-primary via-orange-500 to-rose-600 border-none"
                      onClick={handleGenerate}
                      isLoading={createPrompt.isPending}
                    >
                      <Sparkles size={20} className="mr-3 fill-current" />
                      Arsiteki Prompt
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === "RESULT" && (
              <motion.div
                key="step-result"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto"
              >
                <div className="mb-8 flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep("FORM")}
                    className="rounded-full font-black uppercase text-[10px] tracking-widest border border-border/50 h-10 px-8"
                  >
                    <ArrowLeft size={14} className="mr-2" /> Edit Konfigurasi
                  </Button>
                </div>

                <PromptResultDisplay
                  generatedPrompt={createPrompt.data?.generatedPrompt || null}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
