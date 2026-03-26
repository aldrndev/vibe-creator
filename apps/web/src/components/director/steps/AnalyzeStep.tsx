import { Loader2, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { Card, CardBody } from '@/components/ui';
import { logger } from '@/lib/logger';
import { authFetch } from '@/services/api';
import { useDirectorStore } from '@/stores/director-store';

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
        'Menonton video kamu...',
        'Mencari momen menarik...',
        'Menemukan bagian seru...',
        'Menganalisis suara dan musik...',
        'Menandai potongan terbaik...',
        'Menyusun rekomendasi klip...',
        'Hampir selesai...',
      ];
      const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
      const timestamp = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      addAnalysisLog(`[${timestamp}] ${randomTask}`);
    }, 1200);

    // Polling
    interval = setInterval(async () => {
      try {
        const res = await authFetch(`/api/v1/director/sessions/${activeSession.id}/analyze`);
        const data = await res.json();

        if (data.success && data.data) {
          const job = data.data;
          if (job.status === 'COMPLETED') {
            if (job.candidates) {
              setCandidates(job.candidates);
            }
            setStep('PICKING');
            setLoading(false);
          } else if (job.status === 'FAILED') {
            setError(job.errorMessage || 'Analysis failed');
            setLoading(false);
          }
        }
      } catch (err) {
        logger.error('Polling error', err);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(logInterval);
    };
  }, [activeSession, setStep, setCandidates, setLoading, setError, addAnalysisLog]);

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-card/70 border-border/50 backdrop-blur-xl relative overflow-hidden group">
        <CardBody className="p-8 sm:p-12 flex flex-col items-center text-center gap-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center mb-2 relative">
            <Sparkles className="w-12 h-12 text-white drop-shadow-sm" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-primary via-orange-500 to-rose-600">
              Menganalisis Konten
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed font-medium">
              AI kami sedang mempelajari video kamu untuk menemukan momen-momen yang paling
              berpotensi viral. 🎬
            </p>
          </div>

          {/* Terminal Logs */}
          <div className="w-full max-w-md bg-zinc-950/80 rounded-3xl p-6 font-mono text-[11px] text-left h-52 overflow-hidden flex flex-col justify-end border border-border/40 relative shadow-inner">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Processing
              </span>
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            </div>

            <div className="space-y-1.5">
              {analysisLogs.map((log, i) => (
                <div
                  key={log}
                  className="text-foreground/60 truncate animate-in slide-in-from-left-2 fade-in duration-300 flex gap-2"
                >
                  <span className="text-primary/40 font-bold shrink-0">[{i + 1}]</span>
                  <span className="truncate">{log}</span>
                </div>
              ))}
              <div className="pt-2 flex items-center gap-2">
                <span className="text-primary font-bold">➜</span>
                <span className="text-foreground/40 italic">Mengekstrak metadata visual...</span>
                <span className="w-1.5 h-4 bg-primary animate-pulse inline-block rounded-sm" />
              </div>
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 animate-pulse">
            Estimasi waktu: 30-60 detik
          </p>
        </CardBody>
      </Card>
    </div>
  );
};
