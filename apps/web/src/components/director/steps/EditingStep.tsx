import { Captions, Download, FileVideo, Scissors, Trash2, Zap } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { Badge, Button, Card, CardBody, Switch } from '@/components/ui';
import { useAuthenticatedObjectUrl } from '@/hooks/use-authenticated-object-url';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import type { DirectorSession, RefineSettings, SelectedClip } from '@/stores/director-store';
import { useDirectorStore } from '@/stores/director-store';

interface SelectedClipCardProps {
  readonly activeSession: DirectorSession;
  readonly clip: SelectedClip;
  readonly index: number;
  readonly settings: RefineSettings;
  readonly onRemoveClip: (clipId: string) => void;
  readonly onUpdateRefineSetting: (
    clipId: string,
    key: keyof RefineSettings,
    value: boolean | string,
  ) => void;
  readonly onUpdateTranscript: (
    clipId: string,
    segments: Array<{ startMs: number; endMs: number; text: string }>,
  ) => void;
}

function SelectedClipCard({
  activeSession,
  clip,
  index,
  settings,
  onRemoveClip,
  onUpdateRefineSetting,
  onUpdateTranscript,
}: SelectedClipCardProps) {
  const previewFileName = clip.candidate.previewStorageKey?.split('/').pop();
  const previewUrl = useAuthenticatedObjectUrl(
    previewFileName
      ? `/api/v1/director/sessions/${activeSession.id}/previews/${previewFileName}`
      : null,
  );
  const duration = Math.round((clip.candidate.endMs - clip.candidate.startMs) / 1000);

  return (
    <div className="bg-card/40 p-5 sm:p-6 rounded-4xl border border-border/40 flex flex-col sm:row gap-6 group hover:border-primary/30 transition-all duration-300 relative z-10 shadow-sm">
      <div className="w-full sm:w-32 aspect-9/16 bg-muted/20 rounded-2xl overflow-hidden relative border border-border/50 shrink-0 group-hover:scale-[1.02] transition-transform duration-500">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Preview clip ${index + 1}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <FileVideo size={32} strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30">
            <Scissors size={14} className="text-primary" />
          </div>
        </div>
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase">
            {duration}s
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-foreground text-lg">Clip Segment {index + 1}</h4>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="h-5">
                {clip.candidate.tags?.includes('HIGH ENERGY') ? '🔥 High Energy' : '✨ Highlight'}
              </Badge>
              <Badge variant="secondary" className="h-5">
                Auto-Reframed
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemoveClip(clip.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/20 rounded-2xl border border-border/40">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
              Face Tracking
            </span>
            <Switch
              checked={settings.faceTracking}
              onCheckedChange={(value: boolean) =>
                onUpdateRefineSetting(clip.id, 'faceTracking', value)
              }
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
              Hapus Diam
            </span>
            <Switch
              checked={settings.removeSilence}
              onCheckedChange={(value: boolean) =>
                onUpdateRefineSetting(clip.id, 'removeSilence', value)
              }
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
              Stabilisasi
            </span>
            <Switch
              checked={settings.stabilize}
              onCheckedChange={(value: boolean) =>
                onUpdateRefineSetting(clip.id, 'stabilize', value)
              }
            />
          </div>
        </div>

        <div className="flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 block ml-1">
            Takarir / Subtitle (Otomatis)
          </div>
          <textarea
            aria-label={`Subtitle clip ${index + 1}`}
            className="w-full bg-muted/50 border border-border/50 rounded-2xl p-4 text-sm text-foreground/80 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/30 min-h-[100px]"
            placeholder={clip.transcript ? 'Edit takarir...' : 'Menunggu transkripsi...'}
            defaultValue={clip.transcript?.segments?.map((segment) => segment.text).join(' ') || ''}
            onBlur={(e) => {
              const value = e.target.value;
              if (value && clip.transcript?.segments) {
                const segments = [...clip.transcript.segments];

                if (segments.length === 0) {
                  segments.push({ startMs: 0, endMs: 0, text: value });
                } else {
                  const firstSegment = segments[0];
                  if (firstSegment) {
                    firstSegment.text = value;
                  }
                }

                onUpdateTranscript(clip.id, segments);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export const EditingStep = () => {
  const {
    activeSession,
    selectedClips,
    setSelectedClips,
    refineSettings,
    updateRefineSetting,
    subtitleStyle,
    updateSubtitleStyle,
    exportSettings,
    setExportSettings,
    transcribeJob,
    setTranscribeJob,
    setStep,
    isLoading,
    setLoading,
    setError,
    setExportJob,
  } = useDirectorStore();

  const refreshSelectedClips = useCallback(async () => {
    if (!activeSession) {
      return;
    }

    try {
      const clipsRes = await authFetch(`/api/v1/director/sessions/${activeSession.id}/clips`);
      const clipsData = await clipsRes.json();

      if (clipsData.success) {
        setSelectedClips(clipsData.data);
      }
    } catch (error) {
      logger.error('Load clips error', error);
    }
  }, [activeSession, setSelectedClips]);

  const pollTranscriptionStatus = useCallback(async () => {
    if (!activeSession) {
      return false;
    }

    try {
      const jobRes = await authFetch(`/api/v1/director/sessions/${activeSession.id}/transcribe`);
      const jobData = await jobRes.json();

      if (!jobData.success) {
        return false;
      }

      const newStatus = jobData.data.status;
      setTranscribeJob(jobData.data);

      if (newStatus === 'COMPLETED' || newStatus === 'FAILED') {
        await refreshSelectedClips();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Poll transcription error', error);
      return false;
    }
  }, [activeSession, refreshSelectedClips, setTranscribeJob]);

  const handleStartTranscribe = async () => {
    if (!activeSession) return;
    try {
      const res = await authFetch(`/api/v1/director/sessions/${activeSession.id}/transcribe`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setTranscribeJob({ status: 'PROCESSING', ...data.data });
      }
    } catch (err) {
      logger.error('Transcription start failed', err);
    }
  };

  const handleUpdateTranscript = async (
    clipId: string,
    segments: Array<{ startMs: number; endMs: number; text: string }>,
  ) => {
    if (!activeSession) return;
    try {
      await authFetch(`/api/v1/director/sessions/${activeSession.id}/clips/${clipId}/transcript`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments }),
      });
    } catch (error) {
      logger.error('Update transcript failed', error);
    }
  };

  const handleRemoveClip = (clipId: string) => {
    setSelectedClips(selectedClips.filter((clip) => clip.id !== clipId));
  };

  const handleStartExport = async () => {
    if (!activeSession) return;
    try {
      setLoading(true);
      const res = await authFetch(`/api/v1/director/sessions/${activeSession.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportSettings),
      });
      const data = await res.json();
      if (!data.success) throw new Error('Export failed');

      setExportJob({
        ...data.data,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
      setStep('EXPORTING');
    } catch {
      setError('Failed to start export');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeSession || transcribeJob?.status !== 'PROCESSING') {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      const shouldStop = await pollTranscriptionStatus();

      if (cancelled || shouldStop) {
        if (intervalId) globalThis.clearInterval(intervalId);
      }
    };

    intervalId = globalThis.setInterval(() => {
      void tick();
    }, 3000);

    void tick();

    return () => {
      cancelled = true;
      if (intervalId) globalThis.clearInterval(intervalId);
    };
  }, [activeSession, transcribeJob?.status, pollTranscriptionStatus]);

  useEffect(() => {
    if (activeSession && selectedClips.length === 0) {
      void refreshSelectedClips();
    }
  }, [activeSession, selectedClips.length, refreshSelectedClips]);

  return (
    <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col lg:flex-row gap-8">
      <div className="flex-1 bg-card/70 rounded-[2.5rem] border border-border/50 backdrop-blur-xl p-6 sm:p-10 flex flex-col gap-8 relative overflow-hidden group">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <h3 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-br from-primary via-orange-500 to-rose-600">
              Sempurnakan & Takarir
            </h3>
            <p className="text-muted-foreground text-sm font-medium">
              Atur klip dan ubah teks subtitle kamu.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full font-bold px-6 border-primary/20 hover:bg-primary/5"
            onClick={handleStartTranscribe}
            disabled={transcribeJob?.status === 'PROCESSING'}
          >
            <Zap
              size={14}
              className={cn(
                'mr-2',
                transcribeJob?.status === 'PROCESSING' ? 'animate-pulse' : 'text-primary',
              )}
            />
            {transcribeJob?.status === 'PROCESSING' ? 'Mentranskripsi...' : 'Transkripsi Ulang'}
          </Button>
        </div>

        <div className="space-y-4">
          {activeSession &&
            selectedClips.map((clip, index) => (
              <SelectedClipCard
                key={clip.id}
                activeSession={activeSession}
                clip={clip}
                index={index}
                settings={
                  refineSettings[clip.id] ?? {
                    faceTracking: true,
                    removeSilence: true,
                    stabilize: false,
                  }
                }
                onRemoveClip={handleRemoveClip}
                onUpdateRefineSetting={updateRefineSetting}
                onUpdateTranscript={handleUpdateTranscript}
              />
            ))}
        </div>
      </div>

      <div className="w-full lg:w-80 space-y-6">
        <Card className="bg-card/70 border-border/50 backdrop-blur-xl rounded-4xl overflow-hidden">
          <CardBody className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Download size={20} className="text-primary" />
              </div>
              <h4 className="font-black tracking-tight text-lg">Ekspor</h4>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block ml-1">
                Kualitas
              </div>
              <div className="flex bg-muted/30 rounded-2xl p-1.5 border border-border/40">
                {['720p', '1080p'].map((quality) => (
                  <button
                    type="button"
                    key={quality}
                    onClick={() =>
                      setExportSettings({
                        quality: quality as '720p' | '1080p',
                      })
                    }
                    className={cn(
                      'flex-1 px-4 py-2 rounded-xl text-xs font-black transition-all',
                      exportSettings.quality === quality
                        ? 'bg-card text-primary border border-border/50'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block ml-1">
                Rasio Aspek
              </div>
              <div className="flex bg-muted/30 rounded-2xl p-1.5 border border-border/40">
                {['9:16', '16:9', '1:1'].map((ratio) => (
                  <button
                    type="button"
                    key={ratio}
                    onClick={() =>
                      setExportSettings({
                        aspectRatio: ratio as '9:16' | '16:9' | '1:1',
                      })
                    }
                    className={cn(
                      'flex-1 px-4 py-2 rounded-xl text-xs font-black transition-all',
                      exportSettings.aspectRatio === ratio
                        ? 'bg-card text-primary border border-border/50'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full rounded-2xl h-14 font-black uppercase tracking-widest text-[11px] relative overflow-hidden group/btn"
              onClick={handleStartExport}
              isLoading={isLoading}
              disabled={isLoading}
            >
              <span className="relative z-10">Mulai Ekspor</span>
              <div className="absolute inset-0 bg-linear-to-r from-primary via-orange-500 to-rose-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
            </Button>
          </CardBody>
        </Card>

        <Card className="bg-card/70 border-border/50 backdrop-blur-xl rounded-4xl">
          <CardBody className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Captions size={20} className="text-orange-500" />
              </div>
              <h4 className="font-black tracking-tight text-lg">Gaya Teks</h4>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                  Ukuran Font
                </div>
                <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {subtitleStyle.fontSize}px
                </span>
              </div>
              <input
                type="range"
                min="16"
                max="48"
                value={subtitleStyle.fontSize}
                onChange={(e) =>
                  updateSubtitleStyle({
                    fontSize: Number.parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
