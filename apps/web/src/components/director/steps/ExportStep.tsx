import { AlertCircle, CheckCircle2, Download, RotateCcw } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { Button, Card, CardBody, Spinner } from '@/components/ui';
import { logger } from '@/lib/logger';
import { authFetch, downloadAuthenticatedFile } from '@/services/api';
import { useDirectorStore } from '@/stores/director-store';

interface ExportStatusPanelProps {
  readonly isCompleted: boolean;
  readonly isFailed: boolean;
  readonly errorMessage?: string | null;
}

function ExportStatusPanel({ isCompleted, isFailed, errorMessage }: ExportStatusPanelProps) {
  let title = 'Merender Video...';
  if (isCompleted) title = 'Ekspor Selesai!';
  else if (isFailed) title = 'Ekspor Gagal';

  let description =
    'Mohon tunggu sementara kami menggabungkan klip, menstabilkan, dan menerapkan gaya pada video kamu.';
  if (isCompleted) description = 'Video AI kamu sudah siap untuk diunduh. 🎉';
  else if (isFailed) description = errorMessage || 'Terjadi kesalahan sistem.';

  return (
    <>
      {isCompleted && (
        <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-2 border border-emerald-500/20">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 lg:w-14 lg:h-14" />
        </div>
      )}
      {!isCompleted && isFailed && (
        <div className="w-24 h-24 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-2 border border-rose-500/20 shadow-2xl shadow-rose-500/10">
          <AlertCircle className="w-12 h-12 text-rose-500 lg:w-14 lg:h-14" />
        </div>
      )}
      {!isCompleted && !isFailed && (
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-2 border border-primary/20 relative">
          <div className="absolute inset-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-5 border-2 border-primary/40 border-b-transparent rounded-full animate-spin [animation-duration:1.5s]" />
          <Download className="w-8 h-8 text-primary" />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-br from-primary via-orange-500 to-rose-600">
          {title}
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </>
  );
}

export const ExportStep = () => {
  const { activeSession, exportJob, setExportJob, reset, step } = useDirectorStore();
  const isTerminalStatus = exportJob?.status === 'COMPLETED' || exportJob?.status === 'FAILED';

  const pollExportStatus = useCallback(async () => {
    if (!activeSession) {
      return false;
    }

    try {
      const res = await authFetch(`/api/v1/director/sessions/${activeSession.id}/export`);
      const data = await res.json();

      if (!data.success || !data.data) {
        return false;
      }

      const job = data.data;
      const isCompleted = job.status === 'COMPLETED';
      const isFailed = job.status === 'FAILED';

      setExportJob({
        ...job,
        outputUrl:
          isCompleted && job.outputStorageKey
            ? `/api/v1/director/sessions/${activeSession.id}/export/download`
            : null,
      });

      return isCompleted || isFailed;
    } catch (error) {
      logger.error('Poll export error', error);
      return false;
    }
  }, [activeSession, setExportJob]);

  useEffect(() => {
    if (step !== 'EXPORTING' || !activeSession || isTerminalStatus) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      const shouldStop = await pollExportStatus();

      if (cancelled || shouldStop) {
        if (intervalId) globalThis.clearInterval(intervalId);
      }
    };

    intervalId = globalThis.setInterval(() => {
      void tick();
    }, 2000);

    void tick();

    return () => {
      cancelled = true;
      if (intervalId) globalThis.clearInterval(intervalId);
    };
  }, [step, activeSession, isTerminalStatus, pollExportStatus]);

  const handleDownload = async () => {
    if (!exportJob?.outputUrl) {
      return;
    }

    try {
      await downloadAuthenticatedFile(
        exportJob.outputUrl,
        `director-export-${activeSession?.id ?? Date.now()}.mp4`,
      );
    } catch (error) {
      logger.error('Director export download failed', error);
    }
  };

  if (!exportJob) {
    return (
      <div className="flex justify-center p-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const isCompleted = exportJob.status === 'COMPLETED';
  const isFailed = exportJob.status === 'FAILED';

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-card/70 border-border/50 backdrop-blur-xl relative overflow-hidden group">
        <CardBody className="p-8 sm:p-12 flex flex-col items-center text-center gap-8">
          <ExportStatusPanel
            isCompleted={isCompleted}
            isFailed={isFailed}
            errorMessage={exportJob.errorMessage}
          />

          {isCompleted && exportJob.outputUrl && (
            <div className="w-full aspect-9/16 max-w-[280px] rounded-4xl overflow-hidden border border-border/50 shadow-2xl relative bg-linear-to-br from-emerald-500/10 via-background to-primary/10 flex items-center justify-center">
              <div className="text-center space-y-3 px-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-foreground">File siap diunduh</p>
                  <p className="text-xs text-muted-foreground">
                    Preview inline dimatikan untuk menghindari auth di URL.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            {isCompleted && exportJob.outputUrl && (
              <Button
                className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] relative overflow-hidden group/btn"
                onClick={() => {
                  void handleDownload();
                }}
              >
                <Download size={16} className="mr-2" />
                Unduh Video
                <div className="absolute inset-0 bg-linear-to-r from-primary via-orange-500 to-rose-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              </Button>
            )}

            {(isCompleted || isFailed) && (
              <Button
                variant="secondary"
                className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] border-primary/20 hover:bg-primary/5"
                onClick={reset}
              >
                <RotateCcw size={16} className="mr-2" />
                Buat Lagi
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
