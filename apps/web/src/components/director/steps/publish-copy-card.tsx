import { RefreshCw, Sparkles } from 'lucide-react';
import { useDirectorPublishCopy } from '@/components/director/steps/use-director-publish-copy';
import { Badge, Button, Card, CardBody } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { DirectorSession, SelectedClip } from '@/stores/director-store';

interface PublishCopyCardProps {
  readonly activeSession: DirectorSession | null;
  readonly selectedClips: SelectedClip[];
}

export function PublishCopyCard({ activeSession, selectedClips }: Readonly<PublishCopyCardProps>) {
  const { publishPack, isGenerating, retryPublishCopy } = useDirectorPublishCopy(
    activeSession,
    selectedClips,
  );

  let publishCopyStatus = publishPack.notice.message;
  let badgeText = 'Fallback Heuristik';
  let isAiSource = false;

  if (isGenerating) {
    publishCopyStatus = 'AI sedang merapikan copy publish...';
  } else if (publishPack.source === 'ai') {
    isAiSource = true;
    const providerName = publishPack.provider === 'ollama' ? 'Ollama' : 'OpenAI';
    publishCopyStatus = `Disarankan oleh AI Director via ${providerName}`;
    badgeText = `AI ${providerName}`;
  }

  const hasRetryError =
    publishPack.notice.lastError &&
    (publishPack.notice.lastError.includes('timeout') ||
      publishPack.notice.lastError.includes('aborted'));

  return (
    <Card className="bg-card/70 border-border/50 backdrop-blur-xl rounded-4xl">
      <CardBody className="p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div>
            <h4 className="font-black tracking-tight text-lg">Copy Publish</h4>
            <p className="text-xs text-muted-foreground">{publishCopyStatus}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              'h-6 rounded-full px-3 text-[10px] font-black uppercase tracking-widest',
              isAiSource
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'border-orange-500/20 bg-orange-500/10 text-orange-500',
            )}
          >
            {badgeText}
          </Badge>
        </div>

        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm leading-6',
            isAiSource
              ? 'border-primary/15 bg-primary/5 text-foreground/85'
              : 'border-orange-500/15 bg-orange-500/5 text-foreground/80',
          )}
        >
          <p>{isAiSource ? publishPack.caption : publishCopyStatus}</p>
          {publishPack.notice.lastError ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {hasRetryError
                ? 'Ollama timeout — pastikan model sudah loaded dan service aktif.'
                : `Error: ${publishPack.notice.lastError}`}
            </p>
          ) : null}
          {publishPack.notice.attemptedProviders?.length ? (
            <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground/70">
              Dicoba via: {publishPack.notice.attemptedProviders.join(', ')}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-full border-primary/15 px-4"
            onClick={retryPublishCopy}
            disabled={isGenerating}
          >
            <RefreshCw size={12} className={cn('mr-1.5', isGenerating && 'animate-spin')} />
            {isGenerating ? 'Mencoba AI...' : 'Retry AI'}
          </Button>
          {isAiSource === false ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Fallback dipakai — retry saat Ollama siap.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Judul
          </div>
          <p className="text-sm font-semibold leading-6 text-foreground">{publishPack.title}</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Caption
          </div>
          <p className="text-sm leading-6 text-foreground/85">{publishPack.caption}</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            CTA
          </div>
          <p className="text-sm leading-6 text-foreground/85">{publishPack.cta}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {publishPack.hashtags.map((hashtag) => (
            <span
              key={hashtag}
              className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-bold text-primary"
            >
              {hashtag}
            </span>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
