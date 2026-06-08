import { useNavigate } from '@tanstack/react-router';
import type { PromptType } from '@vibe-creator/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Button, Card, CardBody, Input } from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import { useCreatePrompt } from '@/hooks/use-prompts';
import { cn } from '@/lib/utils';
import { PromptResultDisplay } from './prompt/components/PromptResultDisplay';
import { PromptTypeSelector } from './prompt/components/PromptTypeSelector';
import { CreativeScanForm } from './prompt/forms/CreativeScanForm';
import { ImageForm } from './prompt/forms/ImageForm';
import { RelaxingForm } from './prompt/forms/RelaxingForm';
import { ScriptForm } from './prompt/forms/ScriptForm';
import { TimelapseForm } from './prompt/forms/TimelapseForm';
import { VideoGenForm } from './prompt/forms/VideoGenForm';
import { VoiceForm } from './prompt/forms/VoiceForm';
import {
  buildPromptInputData,
  createPromptTitle,
  type PromptBuilderFormState,
} from './prompt/prompt-builder.utils';
import {
  type CreativeScanFormData,
  defaultCreativeScanForm,
  defaultImageForm,
  defaultRelaxingForm,
  defaultScriptForm,
  defaultTimelapseForm,
  defaultVideoGenForm,
  defaultVoiceForm,
  type ImageFormData,
  type RelaxingFormData,
  type ScriptFormData,
  type TimelapseFormData,
  type VideoGenFormData,
  type VoiceFormData,
} from './prompt/types';

type Step = 'CATEGORY' | 'FORM' | 'RESULT';

const STEPS: Array<{ key: Step; label: string }> = [
  { key: 'CATEGORY', label: 'Pilih Tipe' },
  { key: 'FORM', label: 'Konfigurasi' },
  { key: 'RESULT', label: 'Hasil' },
];

export function PromptBuilderPage() {
  const navigate = useNavigate();
  const createPrompt = useCreatePrompt();

  // State
  const [currentStep, setCurrentStep] = useState<Step>('CATEGORY');
  const [selectedType, setSelectedType] = useState<PromptType>('SCRIPT');
  const [title, setTitle] = useState('');

  // Forms State
  const [scriptForm, setScriptForm] = useState<ScriptFormData>(defaultScriptForm);
  const [voiceForm, setVoiceForm] = useState<VoiceFormData>(defaultVoiceForm);
  const [videoGenForm, setVideoGenForm] = useState<VideoGenFormData>(defaultVideoGenForm);
  const [imageForm, setImageForm] = useState<ImageFormData>(defaultImageForm);
  const [relaxingForm, setRelaxingForm] = useState<RelaxingFormData>(defaultRelaxingForm);
  const [creativeScanForm, setCreativeScanForm] =
    useState<CreativeScanFormData>(defaultCreativeScanForm);
  const [timelapseForm, setTimelapseForm] = useState<TimelapseFormData>(defaultTimelapseForm);

  // Auto-advance to form after category selection
  const handleTypeSelect = (type: PromptType) => {
    setSelectedType(type);
    setCurrentStep('FORM');
  };

  // Sync animation/step when result arrives
  useEffect(() => {
    if (createPrompt.isSuccess && createPrompt.data) {
      setCurrentStep('RESULT');
    }
  }, [createPrompt.isSuccess, createPrompt.data]);

  const handleGenerate = () => {
    const forms: PromptBuilderFormState = {
      scriptForm,
      voiceForm,
      videoGenForm,
      imageForm,
      relaxingForm,
      creativeScanForm,
      timelapseForm,
    };

    const payload = {
      type: selectedType,
      title: createPromptTitle(selectedType, title),
      inputData: buildPromptInputData(selectedType, forms),
    };

    createPrompt.mutate(payload);
  };

  const currentFormByType: Record<typeof selectedType, ReactNode> = {
    SCRIPT: <ScriptForm data={scriptForm} onChange={setScriptForm} />,
    VOICE: <VoiceForm data={voiceForm} onChange={setVoiceForm} />,
    VIDEO_GEN: <VideoGenForm data={videoGenForm} onChange={setVideoGenForm} />,
    IMAGE: <ImageForm data={imageForm} onChange={setImageForm} />,
    RELAXING: <RelaxingForm data={relaxingForm} onChange={setRelaxingForm} />,
    CREATIVE_SCAN: <CreativeScanForm data={creativeScanForm} onChange={setCreativeScanForm} />,
    TIMELAPSE: <TimelapseForm data={timelapseForm} onChange={setTimelapseForm} />,
    LOOP_SOURCE: (
      <Card className="border-border/50 bg-card/70">
        <CardBody className="space-y-4 p-8 text-center">
          <h2 className="text-xl font-black">Loop Source tersedia di Loop Creator</h2>
          <p className="text-sm font-medium text-muted-foreground">
            Composer khusus memastikan scene, gerakan kontinu, dan audio ambience tetap cocok untuk
            video loop.
          </p>
          <Button className="rounded-xl" onClick={() => navigate({ to: '/tools/loop-creator' })}>
            Buka Loop Creator
          </Button>
        </CardBody>
      </Card>
    ),
  };

  return (
    <PageTransition className="pb-6 lg:pb-10">
      <div className="max-w-[1200px] mx-auto space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/30 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full w-10 h-10 bg-muted/20 border border-border/50"
                onClick={() => navigate({ to: '/dashboard/prompts' })}
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
                Prompt Builder
              </h1>
            </div>
            <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest ml-14">
              Arsitektur Konten Kreatif Berbasis AI
            </p>
          </div>

          {/* Stepper Component */}
          <div className="flex items-center gap-2 bg-muted/10 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md">
            {STEPS.map((s, idx) => {
              const isActive = currentStep === s.key;
              const isPast = STEPS.findIndex((step) => step.key === currentStep) > idx;

              return (
                <div key={s.key} className="flex items-center">
                  <button
                    type="button"
                    disabled={!isPast && !isActive}
                    onClick={() => setCurrentStep(s.key)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300',
                      isActive
                        ? 'bg-primary text-white'
                        : (() => {
                            if (isPast) return 'text-primary hover:bg-primary/5';
                            return 'text-muted-foreground opacity-50';
                          })(),
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border',
                        isActive
                          ? 'bg-white text-primary border-white'
                          : (() => {
                              if (isPast) return 'bg-primary/10 border-primary';
                              return 'bg-muted/20 border-border';
                            })(),
                      )}
                    >
                      {isPast ? <Check size={12} strokeWidth={3} /> : idx + 1}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                      {s.label}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight size={14} className="mx-1 text-muted-foreground/30" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Wizard */}
        <div className="relative min-h-128">
          <AnimatePresence mode="wait">
            {currentStep === 'CATEGORY' && (
              <motion.div
                key="step-category"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="max-w-4xl mx-auto"
              >
                <PromptTypeSelector selectedType={selectedType} onSelect={handleTypeSelect} />
              </motion.div>
            )}

            {currentStep === 'FORM' && (
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
                        onClick={() => setCurrentStep('CATEGORY')}
                      >
                        <RefreshCw size={12} className="mr-2" /> Ganti Tipe
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Nama / Judul Project
                      </div>
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
                  {currentFormByType[selectedType]}

                  <div className="sticky bottom-8 z-20">
                    <Button
                      size="lg"
                      className="w-full h-16 rounded-3xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 bg-linear-to-r from-primary via-orange-500 to-rose-600 border-none"
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

            {currentStep === 'RESULT' && (
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
                    onClick={() => setCurrentStep('FORM')}
                    className="rounded-full font-black uppercase text-[10px] tracking-widest border border-border/50 h-10 px-8"
                  >
                    <ArrowLeft size={14} className="mr-2" /> Edit Konfigurasi
                  </Button>
                </div>

                <PromptResultDisplay generatedPrompt={createPrompt.data?.generatedPrompt || null} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
