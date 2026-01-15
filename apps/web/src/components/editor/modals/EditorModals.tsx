import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Badge,
} from "@/components/ui";
import { VoiceRecorderModal } from "@/components/editor/VoiceRecorderModal";
import { TextOverlayEditor } from "@/components/editor/TextOverlayEditor";
import { ExportModal } from "@/components/editor/ExportModal";
import {
  Globe,
  CheckCircle2,
  Loader2,
  Sparkles,
  Youtube,
  Instagram,
  Twitter,
  Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorModalsProps {
  isUrlModalOpen: boolean;
  closeUrlModal: () => void;
  urlInput: string;
  setUrlInput: (val: string) => void;
  isDownloading: boolean;
  downloadStep: number;
  handleUrlDownload: () => void;
  isVoiceModalOpen: boolean;
  closeVoiceModal: () => void;
  handleVoiceSave: (blob: Blob, duration: number) => void;
  isTextModalOpen: boolean;
  closeTextModal: () => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  handleExportConfirm: (settings: {
    format: "MP4" | "WEBM" | "MOV";
    resolution: "SD" | "HD" | "UHD";
    width?: number;
    height?: number;
    fps?: number;
  }) => void;
  isExporting: boolean;
}

export const EditorModals = ({
  isUrlModalOpen,
  closeUrlModal,
  urlInput,
  setUrlInput,
  isDownloading,
  downloadStep,
  handleUrlDownload,
  isVoiceModalOpen,
  closeVoiceModal,
  handleVoiceSave,
  isTextModalOpen,
  closeTextModal,
  isExportModalOpen,
  setIsExportModalOpen,
  handleExportConfirm,
  isExporting,
}: EditorModalsProps) => {
  return (
    <>
      {/* URL Download Modal */}
      <Dialog
        open={isUrlModalOpen}
        onOpenChange={(open) => !open && closeUrlModal()}
      >
        <DialogContent className="max-w-lg bg-background/60 backdrop-blur-3xl border-white/10 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 pb-4 border-b border-white/5 bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <Globe size={24} />
                </div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">
                  Universal Stream
                </DialogTitle>
              </div>
              <Badge
                variant="outline"
                className="h-6 font-black border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
              >
                PRO_EXTRACTOR
              </Badge>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <Input
                  placeholder="Paste link from YouTube, TikTok, Reels..."
                  value={urlInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUrlInput(e.target.value)
                  }
                  disabled={isDownloading}
                  className="h-16 pl-12 bg-background/40 border-border/40 rounded-2xl font-bold text-base focus:ring-emerald-500/40"
                />
                <Globe
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-emerald-400 transition-colors"
                />
              </div>

              <div className="flex items-center gap-4 flex-wrap px-2">
                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                  Supports:
                </span>
                {[Youtube, Instagram, Twitter, Facebook].map((Icon, i) => (
                  <Icon
                    key={i}
                    size={14}
                    className="text-muted-foreground/30 hover:text-foreground transition-colors"
                  />
                ))}
              </div>
            </div>

            {/* Smart Detection Feedback */}
            {urlInput && !isDownloading && (
              <div className="animate-in fade-in slide-in-from-bottom duration-500">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-xl shadow-emerald-500/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight text-emerald-400">
                        Target Synchronized
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground leading-snug">
                        The capture engine is ready to extract high-quality
                        video artifacts from this link.
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex items-center gap-2">
                    <Sparkles size={12} className="text-amber-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                      AI Resolution Enhancement Active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isDownloading && downloadStep > 0 && (
              <div className="space-y-4 py-4">
                {[
                  { step: 1, label: "Initializing Handshake..." },
                  { step: 2, label: "Extracting Data Stream..." },
                  { step: 3, label: "Verifying Integrity..." },
                  { step: 4, label: "Injecting to Timeline..." },
                ].map(({ step, label }) => (
                  <div key={step} className="flex items-center gap-4 group">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                        downloadStep > step
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                          : downloadStep === step
                          ? "bg-primary text-white animate-pulse"
                          : "bg-white/5 text-muted-foreground/20"
                      )}
                    >
                      {downloadStep > step ? <CheckCircle2 size={16} /> : step}
                    </div>
                    <div className="flex-1">
                      <span
                        className={cn(
                          "text-xs font-black uppercase tracking-widest",
                          downloadStep >= step
                            ? "text-foreground"
                            : "text-muted-foreground/20"
                        )}
                      >
                        {label}
                      </span>
                      {downloadStep === step && (
                        <div className="h-0.5 w-full bg-primary/20 mt-1 rounded-full overflow-hidden">
                          <div className="h-full bg-primary animate-progress-indefinite" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="p-8 pt-4 bg-white/5 border-t border-white/5 flex gap-4">
            <Button
              variant="ghost"
              onClick={closeUrlModal}
              className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px]"
            >
              Abandon
            </Button>
            <Button
              onClick={handleUrlDownload}
              disabled={isDownloading || !urlInput}
              className="h-12 flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all"
            >
              {isDownloading ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <Sparkles size={14} className="mr-2" />
              )}
              Begin Extraction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={closeVoiceModal}
        onSave={handleVoiceSave}
      />

      <TextOverlayEditor isOpen={isTextModalOpen} onClose={closeTextModal} />

      <ExportModal
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        onExport={handleExportConfirm}
        isExporting={isExporting}
      />
    </>
  );
};
