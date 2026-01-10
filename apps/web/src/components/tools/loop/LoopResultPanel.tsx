import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { AlertTriangle, Check } from "lucide-react";
import { LoopMode } from "@/hooks/useLoopCreator";

interface LoopResultPanelProps {
  loopMode: LoopMode;
  resultUrl: string;
}

export function LoopResultPanel({ loopMode, resultUrl }: LoopResultPanelProps) {
  if (!resultUrl) return null;

  return (
    <div className="mt-6">
      <Card className="border-2 border-green-500/30 bg-green-500/5">
        <CardHeader className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Check size={16} className="text-green-500" />
          </div>
          <h2 className="text-lg font-semibold">
            Hasil (
            {loopMode === "loop"
              ? "Seamless"
              : loopMode === "boomerang"
              ? "Boomerang"
              : "GIF"}
            )
          </h2>
          <Badge variant="default">Selesai</Badge>
        </CardHeader>
        <CardBody>
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
            <AlertTriangle
              className="text-yellow-500 shrink-0 mt-0.5"
              size={18}
            />
            <div>
              <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">
                Video Tidak Disimpan Permanen
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Hasil video ini hanya tersimpan di server selama <b>60 menit</b>
                . Harap segera unduh video Anda sebelum dihapus otomatis oleh
                sistem.
              </p>
            </div>
          </div>
          {loopMode === "gif" ? (
            <img
              src={resultUrl}
              alt="Result GIF"
              className="w-full max-w-2xl mx-auto rounded-xl"
            />
          ) : (
            <video
              src={resultUrl}
              controls
              loop
              autoPlay
              muted
              className="w-full max-w-2xl mx-auto rounded-xl"
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
