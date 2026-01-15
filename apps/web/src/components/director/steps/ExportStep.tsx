import { useEffect } from "react";
import { useDirectorStore } from "@/stores/director-store";
import { authFetch, getApiUrl } from "@/services/api";
import { logger } from "@/lib/logger";
import { Card, CardBody, Button, Spinner } from "@/components/ui";
import { CheckCircle2, AlertCircle, Download, RotateCcw } from "lucide-react";

export const ExportStep = () => {
  const { activeSession, exportJob, setExportJob, reset, step } =
    useDirectorStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (
      step === "EXPORTING" &&
      activeSession &&
      !["COMPLETED", "FAILED"].includes(exportJob?.status || "")
    ) {
      interval = setInterval(async () => {
        try {
          const res = await authFetch(
            `/api/v1/director/sessions/${activeSession.id}/export`
          );
          const data = await res.json();

          if (data.success && data.data) {
            const job = data.data;
            const isCompleted = job.status === "COMPLETED";
            const isFailed = job.status === "FAILED";

            setExportJob({
              ...job,
              outputUrl:
                isCompleted && job.outputStorageKey
                  ? getApiUrl(
                      `/api/v1/director/static-assets/${job.outputStorageKey.replace(
                        /^director\//,
                        ""
                      )}`
                    )
                  : null,
            });

            if (isCompleted || isFailed) {
              clearInterval(interval);
            }
          }
        } catch (err) {
          logger.error("Poll export error", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [step, activeSession, exportJob?.status, setExportJob]);

  if (!exportJob)
    return (
      <div className="flex justify-center p-10">
        <Spinner size="lg" />
      </div>
    );

  const isCompleted = exportJob.status === "COMPLETED";
  const isFailed = exportJob.status === "FAILED";

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-card/70 border-border/50 backdrop-blur-xl relative overflow-hidden group">
        <CardBody className="p-8 sm:p-12 flex flex-col items-center text-center gap-8">
          {isCompleted ? (
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-2 border border-emerald-500/20">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 lg:w-14 lg:h-14" />
            </div>
          ) : isFailed ? (
            <div className="w-24 h-24 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-2 border border-rose-500/20 shadow-2xl shadow-rose-500/10">
              <AlertCircle className="w-12 h-12 text-rose-500 lg:w-14 lg:h-14" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-2 border border-primary/20 relative">
              <div className="absolute inset-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-5 border-2 border-primary/40 border-b-transparent rounded-full animate-spin [animation-duration:1.5s]" />
              <Download className="w-8 h-8 text-primary" />
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-primary via-orange-500 to-rose-600">
              {isCompleted
                ? "Ekspor Selesai!"
                : isFailed
                ? "Ekspor Gagal"
                : "Merender Video..."}
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed font-medium">
              {isCompleted
                ? "Video AI kamu sudah siap untuk diunduh. 🎉"
                : isFailed
                ? exportJob.errorMessage || "Terjadi kesalahan sistem."
                : "Mohon tunggu sementara kami menggabungkan klip, menstabilkan, dan menerapkan gaya pada video kamu."}
            </p>
          </div>

          {/* Video Player if Completed */}
          {isCompleted && exportJob.outputUrl && (
            <div className="w-full aspect-[9/16] max-w-[280px] bg-black rounded-[2rem] overflow-hidden border border-border/50 shadow-2xl relative group/video">
              <video
                src={exportJob.outputUrl}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
              <div className="absolute inset-0 bg-primary/5 pointer-events-none group-hover/video:bg-transparent transition-colors" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            {isCompleted && exportJob.outputUrl && (
              <Button
                asChild
                className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] relative overflow-hidden group/btn"
              >
                <a href={exportJob.outputUrl} download>
                  <Download size={16} className="mr-2" />
                  Unduh Video
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-orange-500 to-rose-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                </a>
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
