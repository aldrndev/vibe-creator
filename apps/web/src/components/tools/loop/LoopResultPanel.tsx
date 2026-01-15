import { Card, CardBody, CardHeader, Badge, Button } from "@/components/ui";
import { AlertCircle, CheckCircle2, Download } from "lucide-react";
import { LoopMode } from "@/hooks/useLoopCreator";

interface LoopResultPanelProps {
  loopMode: LoopMode;
  resultUrl: string;
}

export function LoopResultPanel({ loopMode, resultUrl }: LoopResultPanelProps) {
  if (!resultUrl) return null;

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-card/70 backdrop-blur-xl border-emerald-500/20 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Hasil {loopMode.toUpperCase()} Selesai
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Siap Unduh
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
            Ready
          </Badge>
        </CardHeader>
        <CardBody className="p-6">
          <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-4">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <h3 className="text-sm font-black text-amber-600 dark:text-amber-500 uppercase tracking-tight">
                Simpan Segera
              </h3>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Hasil video ini hanya tersimpan di server selama <b>60 menit</b>
                . Harap segera unduh video Anda sebelum dihapus otomatis oleh
                sistem.
              </p>
            </div>
          </div>

          <div className="relative group rounded-[2rem] overflow-hidden border border-border/50 bg-black/40 shadow-inner">
            {loopMode === "gif" ? (
              <img
                src={resultUrl}
                alt="Result GIF"
                className="w-full max-w-2xl mx-auto"
              />
            ) : (
              <video
                src={resultUrl}
                controls
                loop
                autoPlay
                muted
                className="w-full max-w-2xl mx-auto"
              />
            )}

            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                asChild
                size="sm"
                className="rounded-full h-10 px-6 font-bold text-[10px] uppercase tracking-widest"
              >
                <a href={resultUrl} download>
                  <Download size={14} className="mr-2" />
                  Download Cepat
                </a>
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
