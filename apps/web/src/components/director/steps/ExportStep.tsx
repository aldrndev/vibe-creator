import { useEffect } from "react";
import { useDirectorStore } from "@/stores/director-store";
import { authFetch } from "@/services/api";
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
                  ? `/api/v1/director/static-assets/${job.outputStorageKey.replace(
                      /^director\//,
                      ""
                    )}`
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
      <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
        <CardBody className="p-8 flex flex-col items-center text-center gap-6">
          {isCompleted ? (
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          ) : isFailed ? (
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Spinner size="lg" />
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-2">
              {isCompleted
                ? "Export Complete!"
                : isFailed
                ? "Export Failed"
                : "Rendering Video..."}
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
              {isCompleted
                ? "Your AI-generated short is ready to download."
                : isFailed
                ? exportJob.errorMessage || "Something went wrong."
                : "Please wait while we stitch, stabilize, and style your video."}
            </p>
          </div>

          {/* Video Player if Completed */}
          {isCompleted && exportJob.outputUrl && (
            <div className="w-full aspect-[9/16] max-w-xs bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
              <video
                src={exportJob.outputUrl}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            </div>
          )}

          <div className="flex gap-4">
            {isCompleted && exportJob.outputUrl && (
              <Button asChild>
                <a href={exportJob.outputUrl} download>
                  <Download size={18} />
                  Download Video
                </a>
              </Button>
            )}

            {(isCompleted || isFailed) && (
              <Button variant="secondary" onClick={reset}>
                <RotateCcw size={18} />
                Create Another
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
