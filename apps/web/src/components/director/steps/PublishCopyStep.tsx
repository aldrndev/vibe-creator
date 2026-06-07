import { ArrowLeft, Sparkles } from 'lucide-react';
import { PublishCopyCard } from '@/components/director/steps/publish-copy-card';
import { Button, Card, CardBody } from '@/components/ui';
import { getEffectiveRefineSettings } from '@/lib/director-refine-settings';
import { authFetch } from '@/services/api';
import { useDirectorStore } from '@/stores/director-store';

export function PublishCopyStep() {
  const {
    activeSession,
    selectedClips,
    refineSettings,
    exportSettings,
    isLoading,
    setLoading,
    setError,
    setExportJob,
    setStep,
  } = useDirectorStore();

  const handleStartExport = async () => {
    if (!activeSession) {
      return;
    }

    try {
      setLoading(true);
      const response = await authFetch(`/api/v1/director/sessions/${activeSession.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...exportSettings,
          refineSettings: Object.fromEntries(
            selectedClips.map((clip) => [
              clip.id,
              getEffectiveRefineSettings(clip, refineSettings[clip.id]),
            ]),
          ),
        }),
      });
      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error?.message || 'Export gagal dimulai');
      }

      setExportJob({
        ...payload.data,
        status: 'PENDING',
        progress: 0,
        createdAt: new Date().toISOString(),
      });
      setStep('EXPORTING');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal memulai export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),24rem]">
        <Card className="bg-card/70 border-border/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardBody className="p-6 sm:p-10 xl:p-12 space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
                <Sparkles size={14} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Step Publish
                </span>
              </div>
              <h3 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-br from-primary via-orange-500 to-rose-600">
                Finalisasi Copy Untuk Short Final
              </h3>
              <p className="max-w-2xl text-sm leading-6 font-medium text-muted-foreground">
                Video short sudah final di langkah edit. Sekarang tinggal rapikan judul, caption,
                hashtag, dan CTA sebelum generate video akhir.
              </p>
            </div>

            <PublishCopyCard activeSession={activeSession} selectedClips={selectedClips} />
          </CardBody>
        </Card>

        <Card className="bg-card/70 border-border/50 backdrop-blur-xl rounded-4xl h-fit xl:sticky xl:top-24">
          <CardBody className="p-6 sm:p-8 space-y-5">
            <h4 className="font-black tracking-tight text-lg">Lanjutkan Flow</h4>
            <p className="text-sm leading-6 text-muted-foreground">
              Kembali ke Edit Short jika transkrip belum pas, atau generate jika copy publish sudah
              siap.
            </p>

            <Button
              type="button"
              variant="secondary"
              className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[11px] border-primary/20 hover:bg-primary/5"
              onClick={() => {
                setStep('EDITING');
              }}
            >
              <ArrowLeft size={14} className="mr-2" />
              Kembali Edit
            </Button>

            <Button
              type="button"
              className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[11px]"
              onClick={() => {
                void handleStartExport();
              }}
              isLoading={isLoading}
              disabled={isLoading || selectedClips.length === 0}
            >
              Generate Preview
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
