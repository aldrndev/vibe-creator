import {
  createDefaultLoopSourcePromptInput,
  findLoopScene,
  generateLoopSourcePrompt,
  LOOP_LIGHTING_OPTIONS,
  LOOP_MOOD_OPTIONS,
  LOOP_SCENE_DEFINITIONS,
  LOOP_VISUAL_STYLE_OPTIONS,
  type LoopLightingOption,
  type LoopSourcePromptInput,
} from '@vibe-creator/shared';
import { Check, Copy, FileUp, Sparkles, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { loopSourcePromptInputSchema } from './loop-source-prompt.schema';
import { LoopSourcePromptReview } from './loop-source-prompt-review';

type ComposerStep = 'scene' | 'options' | 'review';

interface LoopSourcePromptDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onUploadResult: () => void;
  readonly initialInput?: LoopSourcePromptInput;
}

const FORMAT_OPTIONS = [
  { value: '16:9', label: 'Landscape', ratio: '16:9' },
  { value: '9:16', label: 'Portrait', ratio: '9:16' },
  { value: '1:1', label: 'Square', ratio: '1:1' },
  { value: '4:5', label: 'Feed', ratio: '4:5' },
] as const;
const DURATION_OPTIONS = [8, 10, 15] as const;
const PROMPT_TEXTAREA_CLASS_NAME =
  'rounded-xl focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0';
const COMPOSER_STEPS: ReadonlyArray<{ value: ComposerStep; label: string }> = [
  { value: 'scene', label: 'Pilih Scene' },
  { value: 'options', label: 'Atur Suasana' },
  { value: 'review', label: 'Review Prompt' },
];

/** Final prompt actions keep prompt generation ephemeral until a video is uploaded. */
export const LOOP_SOURCE_REVIEW_ACTION_LABELS = {
  copy: 'Copy Prompt',
  upload: 'Upload Hasil Video',
} as const;

export function LoopSourcePromptDialog({
  open,
  onOpenChange,
  onUploadResult,
  initialInput,
}: LoopSourcePromptDialogProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<ComposerStep>('scene');
  const [input, setInput] = useState<LoopSourcePromptInput>(
    initialInput ?? createDefaultLoopSourcePromptInput(),
  );
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInput(initialInput ?? createDefaultLoopSourcePromptInput());
    setStep(initialInput ? 'review' : 'scene');
    setCopied(false);
    setValidationError(null);
  }, [initialInput, open]);

  const scrollContentToTop = () => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]',
    );
    if (viewport) {
      viewport.scrollTop = 0;
    }
  };

  const showStep = (nextStep: ComposerStep) => {
    scrollContentToTop();
    setStep(nextStep);
  };

  const scene = findLoopScene(input.sceneId);
  const generatedPrompt = useMemo(() => {
    const parsed = loopSourcePromptInputSchema.safeParse(input);
    return parsed.success ? generateLoopSourcePrompt(parsed.data) : '';
  }, [input]);
  const activeStepIndex = COMPOSER_STEPS.findIndex((item) => item.value === step);

  const selectScene = (sceneId: LoopSourcePromptInput['sceneId']) => {
    const nextScene = findLoopScene(sceneId);
    setInput((current) => ({
      ...current,
      sceneId,
      mood: nextScene?.defaultMood ?? current.mood,
      lighting: nextScene?.defaultLighting ?? current.lighting,
    }));
    setValidationError(null);
  };

  const continueToReview = () => {
    const parsed = loopSourcePromptInputSchema.safeParse(input);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Lengkapi konfigurasi prompt.');
      return;
    }
    setInput(parsed.data);
    setValidationError(null);
    showStep('review');
  };

  const copyPrompt = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const uploadResult = () => {
    onOpenChange(false);
    onUploadResult();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(92dvh,820px)] w-[min(960px,calc(100vw-24px))] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-3xl border-border/60 bg-card/98 p-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[min(92dvh,820px)] max-sm:translate-y-0 max-sm:rounded-b-none">
        <DialogHeader className="border-b border-border/45 px-6 pb-5 pt-6 pr-16 text-left md:px-8">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <WandSparkles size={22} />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">
            Buat Prompt Video Loop
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-2xl font-medium">
            Buat source ambience dengan visual dan audio natural yang tersambung halus saat
            diperpanjang.
          </DialogDescription>
          <ol
            aria-label="Langkah pembuatan prompt"
            className="mx-auto mt-6 flex w-full max-w-xl items-start"
          >
            {COMPOSER_STEPS.map((item, index) => {
              const isComplete = index < activeStepIndex;
              const isActive = item.value === step;

              return (
                <li
                  key={item.value}
                  aria-current={isActive ? 'step' : undefined}
                  className="relative flex flex-1 flex-col items-center gap-2 text-center"
                >
                  {index < COMPOSER_STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-[calc(50%+1.25rem)] top-4 h-px w-[calc(100%-2.5rem)]',
                        isComplete ? 'bg-primary' : 'bg-border/70',
                      )}
                    />
                  ) : null}
                  <span
                    className={cn(
                      'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black transition-colors',
                      isComplete && 'border-primary bg-primary text-primary-foreground',
                      isActive && 'border-primary bg-primary/15 text-primary',
                      !isComplete && !isActive && 'border-border bg-card text-muted-foreground',
                    )}
                  >
                    {isComplete ? <Check size={14} /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-bold',
                      isActive || isComplete ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="h-full min-h-0">
          <div className="p-6 md:p-8">
            {(() => {
              if (step === 'scene') {
                return <SceneSelection input={input} onSelect={selectScene} />;
              }
              if (step === 'options') {
                return (
                  <PromptOptions
                    input={input}
                    onChange={setInput}
                    supportedLighting={
                      scene?.supportedLighting ?? LOOP_LIGHTING_OPTIONS.map((o) => o.value)
                    }
                  />
                );
              }
              return <LoopSourcePromptReview input={input} prompt={generatedPrompt} />;
            })()}
            {validationError ? (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
              >
                {validationError}
              </p>
            ) : null}
          </div>
        </ScrollArea>

        <div className="flex flex-col-reverse gap-3 border-t border-border/45 bg-background/40 p-5 sm:flex-row sm:justify-between md:px-8">
          {step === 'scene' ? (
            <div />
          ) : (
            <Button
              variant="ghost"
              className="h-11 rounded-xl"
              onClick={() => showStep(step === 'review' ? 'options' : 'scene')}
            >
              {step === 'review' ? 'Ubah Pilihan' : 'Kembali'}
            </Button>
          )}
          {(() => {
            if (step === 'scene') {
              return (
                <Button className="h-11 rounded-xl px-7" onClick={() => showStep('options')}>
                  Atur Suasana
                </Button>
              );
            }
            if (step === 'options') {
              return (
                <Button className="h-11 rounded-xl px-7" onClick={continueToReview}>
                  Buat Prompt
                </Button>
              );
            }
            return (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="h-11 rounded-xl" onClick={copyPrompt}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Prompt Disalin' : LOOP_SOURCE_REVIEW_ACTION_LABELS.copy}
                </Button>
                <Button className="h-11 rounded-xl" onClick={uploadResult}>
                  <FileUp size={16} />
                  {LOOP_SOURCE_REVIEW_ACTION_LABELS.upload}
                </Button>
              </div>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SceneSelection({
  input,
  onSelect,
}: {
  input: LoopSourcePromptInput;
  onSelect: (sceneId: LoopSourcePromptInput['sceneId']) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold">Pilih ambience utama</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Audio natural sudah disesuaikan dengan tiap scene.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LOOP_SCENE_DEFINITIONS.map((scene) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => onSelect(scene.id)}
            className={cn(
              'overflow-hidden rounded-xl border bg-muted/10 text-left transition-colors',
              input.sceneId === scene.id
                ? 'border-primary ring-1 ring-primary'
                : 'border-border/55 hover:border-primary/50',
            )}
          >
            <img
              src={scene.thumbnailUrl}
              alt=""
              className="h-24 w-full object-cover"
              loading="lazy"
            />
            <span className="block px-3 pb-3 pt-2.5">
              <span className="block text-sm font-bold">{scene.label}</span>
              <span className="mt-1 line-clamp-2 block text-xs font-medium text-muted-foreground">
                {scene.description}
              </span>
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSelect('custom')}
          className={cn(
            'flex min-h-[154px] flex-col justify-center rounded-xl border p-4 text-left transition-colors',
            input.sceneId === 'custom'
              ? 'border-primary bg-primary/10 ring-1 ring-primary'
              : 'border-dashed border-border/60 hover:border-primary/50',
          )}
        >
          <Sparkles size={20} className="mb-3 text-primary" />
          <span className="text-sm font-bold">Custom Scene</span>
          <span className="mt-1 text-xs font-medium text-muted-foreground">
            Rancang ambience khusus dengan audio yang cocok.
          </span>
        </button>
      </div>
    </div>
  );
}

function PromptOptions({
  input,
  onChange,
  supportedLighting,
}: {
  input: LoopSourcePromptInput;
  onChange: (value: LoopSourcePromptInput) => void;
  supportedLighting: readonly LoopLightingOption[];
}) {
  return (
    <div className="space-y-7">
      {input.sceneId === 'custom' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea
            label="Lingkungan"
            className={PROMPT_TEXTAREA_CLASS_NAME}
            placeholder="Contoh: quiet wooden cabin facing a snowy pine forest..."
            value={input.customScene?.environment ?? ''}
            onChange={(event) =>
              onChange({
                ...input,
                customScene: {
                  environment: event.target.value,
                  focalPoint: input.customScene?.focalPoint ?? '',
                  continuousMotion: input.customScene?.continuousMotion ?? '',
                  nativeAudio: input.customScene?.nativeAudio ?? '',
                },
              })
            }
          />
          <Input
            label="Fokus utama"
            placeholder="Contoh: glowing window and snowfall"
            value={input.customScene?.focalPoint ?? ''}
            onChange={(event) =>
              onChange({
                ...input,
                customScene: {
                  environment: input.customScene?.environment ?? '',
                  focalPoint: event.target.value,
                  continuousMotion: input.customScene?.continuousMotion ?? '',
                  nativeAudio: input.customScene?.nativeAudio ?? '',
                },
              })
            }
          />
          <Textarea
            label="Gerakan kontinu"
            className={PROMPT_TEXTAREA_CLASS_NAME}
            placeholder="Contoh: gentle snowfall drifting at a steady pace..."
            value={input.customScene?.continuousMotion ?? ''}
            onChange={(event) =>
              onChange({
                ...input,
                customScene: {
                  environment: input.customScene?.environment ?? '',
                  focalPoint: input.customScene?.focalPoint ?? '',
                  continuousMotion: event.target.value,
                  nativeAudio: input.customScene?.nativeAudio ?? '',
                },
              })
            }
          />
          <Textarea
            label="Audio ambience asli"
            className={PROMPT_TEXTAREA_CLASS_NAME}
            placeholder="Contoh: soft winter wind and gentle wooden room tone..."
            value={input.customScene?.nativeAudio ?? ''}
            onChange={(event) =>
              onChange({
                ...input,
                customScene: {
                  environment: input.customScene?.environment ?? '',
                  focalPoint: input.customScene?.focalPoint ?? '',
                  continuousMotion: input.customScene?.continuousMotion ?? '',
                  nativeAudio: event.target.value,
                },
              })
            }
          />
        </div>
      ) : null}
      <OptionGroup
        title="Suasana"
        values={LOOP_MOOD_OPTIONS}
        selected={input.mood}
        onSelect={(mood) => onChange({ ...input, mood })}
      />
      <OptionGroup
        title="Cahaya"
        values={LOOP_LIGHTING_OPTIONS.filter((option) => supportedLighting.includes(option.value))}
        selected={input.lighting}
        onSelect={(lighting) => onChange({ ...input, lighting })}
      />
      <OptionGroup
        title="Gaya visual"
        values={LOOP_VISUAL_STYLE_OPTIONS}
        selected={input.visualStyle}
        onSelect={(visualStyle) => onChange({ ...input, visualStyle })}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <OptionGroup
          title="Format video"
          values={FORMAT_OPTIONS}
          selected={input.aspectRatio}
          onSelect={(aspectRatio) => onChange({ ...input, aspectRatio })}
        />
        <OptionGroup
          title="Durasi source"
          values={DURATION_OPTIONS.map((seconds) => ({
            value: seconds,
            label: `${seconds} detik`,
          }))}
          selected={input.durationSeconds}
          onSelect={(durationSeconds) => onChange({ ...input, durationSeconds })}
        />
      </div>
      <Textarea
        label="Detail tambahan (opsional)"
        className={PROMPT_TEXTAREA_CLASS_NAME}
        maxLength={400}
        placeholder="Contoh: dark walnut table, pine trees after light rain..."
        value={input.additionalDetail ?? ''}
        onChange={(event) => onChange({ ...input, additionalDetail: event.target.value })}
      />
      <p className="text-xs font-medium text-muted-foreground">
        Kamera statis, audio ambience asli, dan syarat seamless selalu ditambahkan otomatis.
      </p>
    </div>
  );
}

function OptionGroup<T extends string | number>({
  title,
  values,
  selected,
  onSelect,
}: {
  title: string;
  values: ReadonlyArray<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-black uppercase text-muted-foreground">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {values.map((item) => (
          <button
            key={String(item.value)}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              'min-h-11 rounded-xl border px-3.5 py-2 text-sm font-semibold',
              selected === item.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border/55 bg-muted/10 hover:border-primary/40',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
