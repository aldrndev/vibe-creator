import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PromptType } from '@vibe-creator/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Button, Card, CardBody, Input } from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import { useCreatePrompt, useCreateVersion, usePrompt } from '@/hooks/use-prompts';
import { cn } from '@/lib/utils';
import { PromptResultDisplay } from './prompt/components/PromptResultDisplay';
import { PromptTypeSelector } from './prompt/components/PromptTypeSelector';
import { CreativeScanForm } from './prompt/forms/CreativeScanForm';
import { ImageForm } from './prompt/forms/ImageForm';
import { RelaxingForm } from './prompt/forms/RelaxingForm';
import { ScriptForm } from './prompt/forms/ScriptForm';
import { SocialCopyForm } from './prompt/forms/SocialCopyForm';
import { TalkingHeadForm } from './prompt/forms/TalkingHeadForm';
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
  defaultSocialCopyForm,
  defaultTalkingHeadForm,
  defaultVideoGenForm,
  defaultVoiceForm,
  type ImageFormData,
  type RelaxingFormData,
  type ScriptFormData,
  type SocialCopyFormData,
  type TalkingHeadFormData,
  type VideoGenFormData,
  type VoiceFormData,
} from './prompt/types';

type Step = 'CATEGORY' | 'FORM' | 'RESULT';

const STEPS: Array<{ key: Step; label: string }> = [
  { key: 'CATEGORY', label: 'Pilih Tipe' },
  { key: 'FORM', label: 'Konfigurasi' },
  { key: 'RESULT', label: 'Hasil' },
];

function ScrollToTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  return null;
}

export function PromptBuilderPage() {
  const navigate = useNavigate();
  const createPrompt = useCreatePrompt();

  // Grab the type-safe search parameters for edit mode
  const { edit: editPromptId } = useSearch({ from: '/_app/dashboard_/prompts_/new' });
  const { data: editPrompt } = usePrompt(editPromptId ?? '');
  const [hasLoadedEdit, setHasLoadedEdit] = useState(false);

  // State
  const [currentStep, setCurrentStep] = useState<Step>('CATEGORY');
  const [selectedType, setSelectedType] = useState<PromptType>('SCRIPT');
  const [title, setTitle] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [createdPromptId, setCreatedPromptId] = useState<string | null>(null);
  const [lastSavedInput, setLastSavedInput] = useState<string | null>(null);

  const createVersion = useCreateVersion();

  // Forms State
  const [scriptForm, setScriptForm] = useState<ScriptFormData>(defaultScriptForm);
  const [voiceForm, setVoiceForm] = useState<VoiceFormData>(defaultVoiceForm);
  const [videoGenForm, setVideoGenForm] = useState<VideoGenFormData>(defaultVideoGenForm);
  const [imageForm, setImageForm] = useState<ImageFormData>(defaultImageForm);
  const [relaxingForm, setRelaxingForm] = useState<RelaxingFormData>(defaultRelaxingForm);
  const [creativeScanForm, setCreativeScanForm] =
    useState<CreativeScanFormData>(defaultCreativeScanForm);
  const [talkingHeadForm, setTalkingHeadForm] =
    useState<TalkingHeadFormData>(defaultTalkingHeadForm);
  const [socialCopyForm, setSocialCopyForm] = useState<SocialCopyFormData>(defaultSocialCopyForm);

  // Effect to populate form states when editing a prompt
  useEffect(() => {
    if (editPrompt && !hasLoadedEdit) {
      setHasLoadedEdit(true);
      setCreatedPromptId(editPrompt.id);
      setSelectedType(editPrompt.type);
      setTitle(editPrompt.title);
      setCurrentStep('FORM');

      const inputData = editPrompt.versions[0]?.inputData;
      if (inputData) {
        const arrayToCsv = (val: unknown): string => {
          if (Array.isArray(val)) {
            return val.join(', ');
          }
          return typeof val === 'string' ? val : '';
        };

        const arrayToJourney = (val: unknown): string => {
          if (Array.isArray(val)) {
            return val.join(' -> ');
          }
          return typeof val === 'string' ? val : '';
        };

        switch (editPrompt.type) {
          case 'SCRIPT': {
            const scriptData = inputData as unknown as Partial<ScriptFormData>;
            setScriptForm((prev) => ({
              ...prev,
              ...scriptData,
              keywords: arrayToCsv(scriptData.keywords),
              emotionalJourney: arrayToJourney(scriptData.emotionalJourney),
            }));
            break;
          }
          case 'VOICE':
            setVoiceForm((prev) => ({
              ...prev,
              ...(inputData as unknown as Partial<VoiceFormData>),
            }));
            break;
          case 'VIDEO_GEN':
            setVideoGenForm((prev) => ({
              ...prev,
              ...(inputData as unknown as Partial<VideoGenFormData>),
            }));
            break;
          case 'IMAGE': {
            const imageData = inputData as unknown as Partial<ImageFormData>;
            setImageForm((prev) => ({
              ...prev,
              ...imageData,
              colors: arrayToCsv(imageData.colors),
            }));
            break;
          }
          case 'RELAXING': {
            const relaxingData = inputData as unknown as Partial<RelaxingFormData>;
            setRelaxingForm((prev) => ({
              ...prev,
              ...relaxingData,
              secondarySounds: arrayToCsv(relaxingData.secondarySounds),
              ambientDetails: arrayToCsv(relaxingData.ambientDetails),
            }));
            break;
          }
          case 'CREATIVE_SCAN':
            setCreativeScanForm((prev) => ({
              ...prev,
              ...(inputData as unknown as Partial<CreativeScanFormData>),
            }));
            break;
          case 'TALKING_HEAD':
            setTalkingHeadForm((prev) => ({
              ...prev,
              ...(inputData as unknown as Partial<TalkingHeadFormData>),
            }));
            break;
          case 'SOCIAL_COPY': {
            const socialCopyData = inputData as unknown as Partial<SocialCopyFormData>;
            setSocialCopyForm((prev) => ({
              ...prev,
              ...socialCopyData,
              keywords: arrayToCsv(socialCopyData.keywords),
            }));
            break;
          }
          default:
            break;
        }
      }
    }
  }, [editPrompt, hasLoadedEdit]);

  const changeStep = useCallback((step: Step) => {
    setCurrentStep(step);
    setValidationErrors({});
    setGlobalError(null);
  }, []);

  // Auto-advance to form after category selection
  const handleTypeSelect = (type: PromptType) => {
    setSelectedType(type);
    changeStep('FORM');
  };

  // Sync animation/step when result arrives
  useEffect(() => {
    if (createPrompt.isSuccess && createPrompt.data) {
      setCreatedPromptId(createPrompt.data.id);
      setLastSavedInput(
        JSON.stringify({
          title: createPrompt.data.title,
          input: createPrompt.data.versions[0]?.inputData,
        }),
      );
      changeStep('RESULT');
    }
  }, [createPrompt.isSuccess, createPrompt.data, changeStep]);

  useEffect(() => {
    if (createVersion.isSuccess && createVersion.data) {
      setLastSavedInput(
        JSON.stringify({
          title: title,
          input: createVersion.data.inputData,
        }),
      );
      changeStep('RESULT');
    }
  }, [createVersion.isSuccess, createVersion.data, title, changeStep]);

  const handleGenerate = () => {
    const validators: Partial<
      Record<
        PromptType,
        (forms: {
          scriptForm: ScriptFormData;
          voiceForm: VoiceFormData;
          videoGenForm: VideoGenFormData;
          imageForm: ImageFormData;
          relaxingForm: RelaxingFormData;
          creativeScanForm: CreativeScanFormData;
          talkingHeadForm: TalkingHeadFormData;
          socialCopyForm: SocialCopyFormData;
        }) => Record<string, boolean>
      >
    > = {
      SCRIPT: ({ scriptForm }) => {
        const errs: Record<string, boolean> = {};
        if (!scriptForm.niche) errs.niche = true;
        if (!scriptForm.targetAudience) errs.targetAudience = true;
        if (!scriptForm.keyMessage) errs.keyMessage = true;
        return errs;
      },
      VOICE: ({ voiceForm }) => {
        const errs: Record<string, boolean> = {};
        if (!voiceForm.script.trim()) errs.script = true;
        return errs;
      },
      VIDEO_GEN: ({ videoGenForm }) => {
        const errs: Record<string, boolean> = {};
        if (!videoGenForm.concept) errs.concept = true;
        return errs;
      },
      IMAGE: ({ imageForm }) => {
        const errs: Record<string, boolean> = {};
        if (!imageForm.subject) errs.subject = true;
        return errs;
      },
      RELAXING: ({ relaxingForm }) => {
        const errs: Record<string, boolean> = {};
        if (!relaxingForm.primarySound) errs.primarySound = true;
        if (relaxingForm.environment === 'custom' && !relaxingForm.customEnvironment.trim()) {
          errs.customEnvironment = true;
        }
        return errs;
      },
      CREATIVE_SCAN: ({ creativeScanForm }) => {
        const errs: Record<string, boolean> = {};
        if (!creativeScanForm.sourceUrl.trim()) errs.sourceUrl = true;
        if (!creativeScanForm.niche) errs.niche = true;
        return errs;
      },
      TALKING_HEAD: ({ talkingHeadForm }) => {
        const errs: Record<string, boolean> = {};
        if (!talkingHeadForm.avatar.trim()) errs.avatar = true;
        if (!talkingHeadForm.script.trim()) errs.script = true;
        return errs;
      },
      SOCIAL_COPY: ({ socialCopyForm }) => {
        const errs: Record<string, boolean> = {};
        if (!socialCopyForm.niche) errs.niche = true;
        return errs;
      },
    };

    const validator = validators[selectedType];
    const errors = validator
      ? validator({
          scriptForm,
          voiceForm,
          videoGenForm,
          imageForm,
          relaxingForm,
          creativeScanForm,
          talkingHeadForm,
          socialCopyForm,
        })
      : {};

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setGlobalError('Mohon lengkapi seluruh kolom wajib (bertanda *) sebelum membuat prompt.');
      window.scrollTo({ top: 200, behavior: 'smooth' });
      return;
    }

    setValidationErrors({});
    setGlobalError(null);

    const forms: PromptBuilderFormState = {
      scriptForm,
      voiceForm,
      videoGenForm,
      imageForm,
      relaxingForm,
      creativeScanForm,
      talkingHeadForm,
      socialCopyForm,
    };

    const payload = {
      type: selectedType,
      title: createPromptTitle(selectedType, title),
      inputData: buildPromptInputData(selectedType, forms),
    };

    if (createdPromptId) {
      const currentInputStr = JSON.stringify({ title: payload.title, input: payload.inputData });
      if (currentInputStr === lastSavedInput) {
        changeStep('RESULT');
        return;
      }
      createVersion.mutate({
        promptId: createdPromptId,
        inputData: payload.inputData,
      });
    } else {
      createPrompt.mutate(payload);
    }
  };

  const currentFormByType: Record<typeof selectedType, ReactNode> = {
    SCRIPT: <ScriptForm data={scriptForm} onChange={setScriptForm} errors={validationErrors} />,
    VOICE: <VoiceForm data={voiceForm} onChange={setVoiceForm} errors={validationErrors} />,
    VIDEO_GEN: (
      <VideoGenForm data={videoGenForm} onChange={setVideoGenForm} errors={validationErrors} />
    ),
    IMAGE: <ImageForm data={imageForm} onChange={setImageForm} errors={validationErrors} />,
    RELAXING: (
      <RelaxingForm data={relaxingForm} onChange={setRelaxingForm} errors={validationErrors} />
    ),
    CREATIVE_SCAN: (
      <CreativeScanForm
        data={creativeScanForm}
        onChange={setCreativeScanForm}
        errors={validationErrors}
      />
    ),

    TALKING_HEAD: (
      <TalkingHeadForm
        data={talkingHeadForm}
        onChange={setTalkingHeadForm}
        errors={validationErrors}
      />
    ),
    SOCIAL_COPY: (
      <SocialCopyForm
        data={socialCopyForm}
        onChange={setSocialCopyForm}
        errors={validationErrors}
      />
    ),
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

  const mutationError = createPrompt.error?.message || createVersion.error?.message || null;

  return (
    <PageTransition className="pb-6 lg:pb-10">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="border-b border-border/30 pb-5 space-y-4">
          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard/prompts' })}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none group"
          >
            <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-1" />
            <span>Riwayat Prompt</span>
          </button>

          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
                Prompt Builder
              </h1>
            </div>
            <p className="text-muted-foreground font-black uppercase text-[9px] tracking-widest ml-14">
              Arsitektur Konten Kreatif Berbasis AI
            </p>
          </div>
        </div>

        {/* Stepper & Wizard Content Area */}
        <div className="space-y-8">
          {/* Stepper Component (Centered above prompt content) */}
          <div className="flex justify-center pt-2">
            <div className="flex items-center gap-2 bg-muted/10 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md">
              {STEPS.map((s, idx) => {
                const isActive = currentStep === s.key;
                const isPast = STEPS.findIndex((step) => step.key === currentStep) > idx;

                return (
                  <div key={s.key} className="flex items-center">
                    <button
                      type="button"
                      disabled={!isPast && !isActive}
                      onClick={() => changeStep(s.key)}
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
                  <ScrollToTop />
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
                  <ScrollToTop />
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
                          onClick={() => changeStep('CATEGORY')}
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
                    {(globalError || mutationError) && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs font-bold text-rose-500 flex items-center gap-3 animate-in fade-in duration-300"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                        <span>{globalError || mutationError}</span>
                      </motion.div>
                    )}

                    {currentFormByType[selectedType]}

                    <div className="sticky bottom-8 z-20">
                      <Button
                        size="lg"
                        className="w-full h-12 md:h-13 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm transition-all active:scale-95 bg-linear-to-r from-primary via-orange-500 to-rose-600 border-none"
                        onClick={handleGenerate}
                        isLoading={createPrompt.isPending || createVersion.isPending}
                      >
                        <Sparkles size={20} className="mr-3 fill-current" />
                        Buat Prompt
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
                  className="max-w-6xl mx-auto"
                >
                  <ScrollToTop />
                  <PromptResultDisplay
                    generatedPrompt={
                      createVersion.data?.generatedPrompt ||
                      createPrompt.data?.generatedPrompt ||
                      null
                    }
                    type={selectedType}
                    onEdit={() => changeStep('FORM')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
