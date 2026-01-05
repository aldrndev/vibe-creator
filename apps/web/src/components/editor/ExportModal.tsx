import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { Download } from "lucide-react";
import { useState } from "react";
// EXPORT_PRESETS removed as we are using direct canvas sync

interface ExportModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onExport: (options: {
    format: "MP4" | "WEBM" | "MOV";
    resolution: "SD" | "HD" | "UHD";
    width?: number;
    height?: number;
    fps?: number;
  }) => void;
  isExporting: boolean;
  currentDimensions?: { width: number; height: number };
}

export function ExportModal({
  isOpen,
  onOpenChange,
  onExport,
  isExporting,
  currentDimensions,
}: ExportModalProps) {
  // Simplified state: Resolution only (Format hardcoded to MP4 for MVP)
  const [resolutionScale, setResolutionScale] = useState<number>(1); // 1 = Source, 0.5 = Half

  if (!currentDimensions) return null;

  const width = Math.round(currentDimensions.width * resolutionScale);
  const height = Math.round(currentDimensions.height * resolutionScale);

  const handleExport = () => {
    onExport({
      format: "MP4",
      resolution: "HD", // Generic flag
      width,
      height,
    });
    onOpenChange(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md" // Smaller modal since it's just confirmation
      backdrop="blur"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Download size={24} className="text-primary" />
                Export Video
              </h2>
            </ModalHeader>
            <ModalBody>
              <div className="bg-content2/50 rounded-lg p-4 space-y-4 border border-content3">
                {/* Summary of what will be exported */}
                <div>
                  <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-1 block">
                    Output Settings (From Canvas)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="bg-background rounded p-2 border border-divider">
                      <div className="text-lg font-bold font-mono">
                        {width} x {height}
                      </div>
                    </div>
                    <div className="text-sm text-foreground/70">
                      MP4 Video <br />
                      30 FPS
                    </div>
                  </div>
                </div>

                {/* Simple Resolution Toggle */}
                <div>
                  <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2 block">
                    Quality
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={resolutionScale === 1 ? "solid" : "bordered"}
                      color={resolutionScale === 1 ? "primary" : "default"}
                      onPress={() => setResolutionScale(1)}
                    >
                      Original (100%)
                    </Button>
                    <Button
                      size="sm"
                      variant={resolutionScale === 0.5 ? "solid" : "bordered"}
                      color={resolutionScale === 0.5 ? "primary" : "default"}
                      onPress={() => setResolutionScale(0.5)}
                    >
                      Draft (50%)
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-foreground/50 text-center mt-2">
                Video akan dirender sesuai tampilan canvas editing Anda.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Batal
              </Button>
              <Button
                color="primary"
                onPress={handleExport}
                isLoading={isExporting}
                startContent={!isExporting && <Download size={18} />}
              >
                Start Export
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
