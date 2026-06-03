import { findLoopScene, type LoopSourcePromptInput } from '@vibe-creator/shared';

interface LoopSourcePromptReviewProps {
  readonly input: LoopSourcePromptInput;
  readonly prompt: string;
}

/** Shows the deterministic prompt result before copy or upload actions. */
export function LoopSourcePromptReview({ input, prompt }: LoopSourcePromptReviewProps) {
  const scene = findLoopScene(input.sceneId);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <ReviewValue label="Scene" value={scene?.label ?? 'Custom Scene'} />
        <ReviewValue label="Format" value={`${input.aspectRatio} - ${input.durationSeconds}s`} />
        <ReviewValue label="Audio" value="Native ambience included" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
        <p className="mb-3 text-[11px] font-black uppercase text-muted-foreground">
          Universal Video Prompt
        </p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {prompt}
        </pre>
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Tempel prompt ini di generator video AI, lalu upload hasil videonya di sini.
      </p>
    </div>
  );
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/45 bg-muted/10 p-3">
      <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
