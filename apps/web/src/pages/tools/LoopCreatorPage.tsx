import { useEffect, useState } from 'react';
import { LoopHeader } from '@/components/tools/loop/LoopHeader';
import { LoopRenderDialog } from '@/components/tools/loop/LoopRenderDialog';
import { LoopSettingsPanel } from '@/components/tools/loop/LoopSettingsPanel';
import { LoopSourcePromptDialog } from '@/components/tools/loop/LoopSourcePromptDialog';
import { LoopVideoPreview } from '@/components/tools/loop/LoopVideoPreview';
import { parseLoopSourcePromptInput } from '@/components/tools/loop/loop-source-prompt.schema';
import { PageTransition } from '@/components/ui/PageTransition';
import { ContinueWorkspaceDialog } from '@/components/workspace/ContinueWorkspaceDialog';
import { useDocumentMetadata } from '@/hooks/use-document-metadata';
import { usePrompt } from '@/hooks/use-prompts';
import { useLoopCreator } from '@/hooks/useLoopCreator';
import { useMutableSearchParams } from '@/lib/route-search';

export function LoopCreatorPage() {
  useDocumentMetadata({
    title: 'Loop Creator - Vibe Creator',
    description:
      'Buat audio ambience seamless loop yang memikat secara otomatis dengan generator pintar.',
  });

  const [params, setParams] = useMutableSearchParams();
  const sessionId = params.get('session') ?? undefined;
  const promptId = params.get('prompt') ?? undefined;
  const [showContinue, setShowContinue] = useState(!sessionId && !promptId);
  const [promptOpen, setPromptOpen] = useState(Boolean(promptId));
  const loop = useLoopCreator(sessionId);
  const { data: storedPrompt } = usePrompt(promptId ?? '');
  const promptVersion = storedPrompt?.versions[0];
  const initialPromptInput =
    storedPrompt?.type === 'LOOP_SOURCE'
      ? parseLoopSourcePromptInput(promptVersion?.inputData)
      : undefined;
  const trimEndMs = loop.document.trim.enabled
    ? (loop.document.trim.endMs ?? loop.sourceInfo?.durationMs ?? 0)
    : (loop.sourceInfo?.durationMs ?? 0);

  useEffect(() => {
    if (!sessionId && loop.projectId) {
      setParams({ session: loop.projectId }, { replace: true });
    }
  }, [loop.projectId, sessionId, setParams]);

  useEffect(() => {
    if (sessionId && loop.message && !loop.isLoading) {
      setParams({ session: undefined }, { replace: true });
    }
  }, [sessionId, loop.message, loop.isLoading, setParams]);

  return (
    <PageTransition className="min-h-full bg-background p-4 md:p-6">
      {!sessionId && showContinue ? (
        <ContinueWorkspaceDialog
          tool="loop-creator"
          onStartNew={() => {
            setShowContinue(false);
            loop.startNew();
          }}
          onUnavailable={() => setShowContinue(false)}
        />
      ) : null}

      <div className="mx-auto max-w-6xl">
        <LoopHeader
          title={loop.title}
          onTitleChange={loop.setTitle}
          isSaving={loop.isSaving}
          hasProject={Boolean(loop.projectId)}
        />
        {loop.message ? (
          <div className="mb-5 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {loop.message}
          </div>
        ) : null}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <LoopVideoPreview
            videoUrl={loop.videoUrl}
            videoRef={loop.videoRef}
            fileInputRef={loop.fileInputRef}
            sourceInfo={loop.sourceInfo}
            trimStartMs={loop.document.trim.enabled ? loop.document.trim.startMs : 0}
            trimEndMs={trimEndMs}
            aspectRatio={loop.document.output.aspectRatio}
            audioMuted={loop.document.audioMuted}
            transitionMode={loop.document.transition.mode}
            loopPreviewUrl={loop.loopPreviewUrl}
            loopPreviewPhase={loop.loopPreviewPhase}
            loopPreviewError={loop.loopPreviewError}
            onRetryPreview={loop.retryLoopPreview}
            onCreatePrompt={() => setPromptOpen(true)}
            onFileSelect={(event) => {
              const file = event.target.files?.[0];
              if (file) void loop.selectVideo(file);
              event.target.value = '';
            }}
          />
          <LoopSettingsPanel
            document={loop.document}
            sourceInfo={loop.sourceInfo}
            tier={loop.tier}
            disabled={loop.isLoading || loop.isSaving}
            summary={loop.renderSummary}
            onChange={loop.updateDocument}
            onRender={() => void loop.render()}
          />
        </div>
      </div>

      <LoopRenderDialog
        open={loop.renderOpen}
        phase={loop.renderPhase}
        progress={loop.renderProgress}
        error={loop.renderError}
        notice={loop.renderNotice}
        result={loop.renderResult}
        onOpenChange={loop.setRenderOpen}
        onDownload={loop.downloadResult}
        onEditBack={() => loop.setRenderOpen(false)}
        onRetry={() => void loop.render()}
      />
      <LoopSourcePromptDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        onUploadResult={() => loop.fileInputRef.current?.click()}
        initialInput={initialPromptInput}
      />
    </PageTransition>
  );
}
