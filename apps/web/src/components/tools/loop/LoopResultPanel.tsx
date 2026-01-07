import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
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
      <Card className="border-2 border-success/30 bg-success/5">
        <CardHeader className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
            <Check size={16} className="text-success" />
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
          <Chip color="success" size="sm" variant="flat">
            Selesai
          </Chip>
        </CardHeader>
        <CardBody>
          <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-sm font-semibold text-warning-700 dark:text-warning-500">
                Video Tidak Disimpan Permanen
              </h3>
              <p className="text-xs text-muted-foreground mt-1 text-warning-800/80 dark:text-warning-300/80">
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
