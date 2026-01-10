import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
} from "@/components/ui";
import { VoiceRecorderModal } from "@/components/editor/VoiceRecorderModal";
import { TextOverlayEditor } from "@/components/editor/TextOverlayEditor";
import { ExportModal } from "@/components/editor/ExportModal";

interface EditorModalsProps {
  // URL Modal
  isUrlModalOpen: boolean;
  closeUrlModal: () => void;
  urlInput: string;
  setUrlInput: (val: string) => void;
  isDownloading: boolean;
  downloadStep: number;
  handleUrlDownload: () => void;

  // Voice Modal
  isVoiceModalOpen: boolean;
  closeVoiceModal: () => void;
  handleVoiceSave: (blob: Blob, duration: number) => void;

  // Text Modal
  isTextModalOpen: boolean;
  closeTextModal: () => void;

  // Export Modal
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import dari URL</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                label="URL Video"
                placeholder="https://youtube.com/watch?v=... atau TikTok/Instagram/Sora"
                value={urlInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUrlInput(e.target.value)
                }
                disabled={isDownloading}
              />
              <p className="text-xs text-muted-foreground">
                Mendukung: YouTube, TikTok, Instagram, Twitter, Facebook, Sora
                AI
              </p>
            </div>

            {/* URL Preview Embed */}
            {urlInput &&
              !isDownloading &&
              (() => {
                const url = urlInput.trim();

                // TikTok - 100% supported
                if (url.includes("tiktok.com")) {
                  return (
                    <div className="rounded-lg overflow-hidden bg-green-500/10 border border-green-500/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-green-500 text-xl">✅</div>
                        <div>
                          <p className="font-medium text-green-500 mb-1">
                            TikTok Siap Download
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Video TikTok akan didownload dan langsung
                            ditambahkan ke timeline.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Instagram - 100% supported
                if (url.includes("instagram.com")) {
                  return (
                    <div className="rounded-lg overflow-hidden bg-green-500/10 border border-green-500/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-green-500 text-xl">✅</div>
                        <div>
                          <p className="font-medium text-green-500 mb-1">
                            Instagram Siap Download
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Video/Reels Instagram akan didownload dan
                            ditambahkan ke timeline.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Twitter/X - supported
                if (url.includes("twitter.com") || url.includes("x.com")) {
                  return (
                    <div className="rounded-lg overflow-hidden bg-green-500/10 border border-green-500/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-green-500 text-xl">✅</div>
                        <div>
                          <p className="font-medium text-green-500 mb-1">
                            Twitter/X Siap Download
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Video Twitter/X akan didownload dan ditambahkan ke
                            timeline.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Facebook - supported
                if (url.includes("facebook.com") || url.includes("fb.watch")) {
                  return (
                    <div className="rounded-lg overflow-hidden bg-green-500/10 border border-green-500/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-green-500 text-xl">✅</div>
                        <div>
                          <p className="font-medium text-green-500 mb-1">
                            Facebook Siap Download
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Video Facebook akan didownload dan ditambahkan ke
                            timeline.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Sora AI - supported
                if (url.includes("sora.chatgpt.com")) {
                  return (
                    <div className="rounded-lg overflow-hidden bg-green-500/10 border border-green-500/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-green-500 text-xl">✨</div>
                        <div>
                          <p className="font-medium text-green-500 mb-1">
                            Sora AI Video Siap Download
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Video AI dari OpenAI Sora akan didownload dan
                            ditambahkan ke timeline.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

            {isDownloading && downloadStep > 0 && (
              <div className="mt-4 space-y-2">
                {[
                  { step: 1, label: "Mengirim request..." },
                  { step: 2, label: "Mendownload video..." },
                  { step: 3, label: "Mengambil file..." },
                  { step: 4, label: "Menambahkan ke timeline..." },
                ].map(({ step, label }) => (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                      ${
                        downloadStep > step
                          ? "bg-green-500 text-white"
                          : downloadStep === step
                          ? "bg-primary text-white animate-pulse"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {downloadStep > step ? "✓" : step}
                    </div>
                    <span
                      className={`text-sm ${
                        downloadStep >= step
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeUrlModal}>
              Batal
            </Button>
            <Button onClick={handleUrlDownload} isLoading={isDownloading}>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={closeVoiceModal}
        onSave={handleVoiceSave}
      />

      {/* Text Overlay Editor Modal */}
      <TextOverlayEditor isOpen={isTextModalOpen} onClose={closeTextModal} />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        onExport={handleExportConfirm}
        isExporting={isExporting}
      />
    </>
  );
};
