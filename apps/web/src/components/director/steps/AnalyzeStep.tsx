import { useEffect } from "react";
import { useDirectorStore } from "@/stores/director-store";
import { authFetch } from "@/services/api";
import { logger } from "@/lib/logger";
import { Card, CardBody } from "@/components/ui";
import { Sparkles, Loader2 } from "lucide-react";

export const AnalyzeStep = () => {
  const {
    activeSession,
    setStep,
    setCandidates,
    setLoading,
    setError,
    analysisLogs,
    addAnalysisLog,
  } = useDirectorStore();

  useEffect(() => {
    if (!activeSession) return;

    let interval: NodeJS.Timeout;
    let logInterval: NodeJS.Timeout;

    // Log simulation
    logInterval = setInterval(() => {
      const tasks = [
        "Menonton video kamu...",
        "Mencari momen menarik...",
        "Menemukan bagian seru...",
        "Menganalisis suara dan musik...",
        "Menandai potongan terbaik...",
        "Menyusun rekomendasi klip...",
        "Hampir selesai...",
      ];
      const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      addAnalysisLog(`[${timestamp}] ${randomTask}`);
    }, 1200);

    // Polling
    interval = setInterval(async () => {
      try {
        const res = await authFetch(
          `/api/v1/director/sessions/${activeSession.id}/analyze`
        );
        const data = await res.json();

        if (data.success && data.data) {
          const job = data.data;
          if (job.status === "COMPLETED") {
            if (job.candidates) {
              setCandidates(job.candidates);
            }
            setStep("PICKING");
            setLoading(false);
          } else if (job.status === "FAILED") {
            setError(job.errorMessage || "Analysis failed");
            setLoading(false);
          }
        }
      } catch (err) {
        logger.error("Polling error", err);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(logInterval);
    };
  }, [
    activeSession,
    setStep,
    setCandidates,
    setLoading,
    setError,
    addAnalysisLog,
  ]);

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
        <CardBody className="p-8 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mb-2 animate-pulse">
            <Sparkles className="w-10 h-10 text-secondary-foreground" />
          </div>

          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-2">
              Analyzing Content
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
              AI sedang menonton videomu... <br />
              Mencari momen viral terbaik untuk dijadikan Shorts.
            </p>
          </div>

          {/* Terminal Logs */}
          <div className="w-full max-w-md bg-black/50 rounded-lg p-4 font-mono text-xs text-left h-48 overflow-hidden flex flex-col justify-end border border-zinc-800 relative">
            <div className="absolute top-2 right-2">
              <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
            </div>
            {analysisLogs.map((log, i) => (
              <div
                key={i}
                className="text-zinc-400 truncate animate-in slide-in-from-left-2 fade-in duration-300"
              >
                <span className="text-zinc-600 mr-2">$</span>
                {log}
              </div>
            ))}
            <div className="mt-1 flex items-center gap-1">
              <span className="text-primary mr-2">➜</span>
              <span className="w-2 h-4 bg-primary animate-pulse inline-block" />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
