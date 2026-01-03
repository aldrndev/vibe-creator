import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Card, CardBody } from "@heroui/react";
import { Download, Music2, Instagram, Youtube, Linkedin, Settings, Check } from "lucide-react";
import { useState } from "react";
import { EXPORT_PRESETS, type ExportPresetId } from '@/constants/export-presets';

interface ExportModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onExport: (options: { 
    format: 'MP4' | 'WEBM' | 'MOV';
    resolution: 'SD' | 'HD' | 'UHD';
    width?: number;
    height?: number;
    fps?: number;
  }) => void;
  isExporting: boolean;
}

const ICONS = {
  Music2,
  Instagram,
  Youtube,
  Linkedin,
  Settings
};

export function ExportModal({ isOpen, onOpenChange, onExport, isExporting }: ExportModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<ExportPresetId>('tiktok');
  
  // Internal state for "Custom" preset
  const [customSettings, setCustomSettings] = useState({
    format: 'MP4' as const,
    resolution: 'HD' as const,
  });

  const handleExport = () => {
    const preset = EXPORT_PRESETS.find(p => p.id === selectedPreset);
    
    if (preset?.specs) {
      onExport(preset.specs);
    } else {
      // Custom preset fallback
      onExport({
        format: customSettings.format,
        resolution: customSettings.resolution,
        width: 1920, // Default to HD for custom for now
        height: 1080
      });
    }
    onOpenChange(false);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      size="2xl"
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
              <p className="text-sm text-foreground/60 font-normal">
                Pilih platform tujuan untuk hasil terbaik
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXPORT_PRESETS.map((preset) => {
                  const Icon = ICONS[preset.icon as keyof typeof ICONS];
                  const isSelected = selectedPreset === preset.id;
                  
                  return (
                    <Card 
                      key={preset.id}
                      isPressable
                      onPress={() => setSelectedPreset(preset.id)}
                      className={`border-2 transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-transparent hover:border-primary/30'
                      }`}
                    >
                      <CardBody className="flex flex-row items-start gap-4 p-4">
                        <div className={`p-3 rounded-lg ${
                          isSelected ? 'bg-primary text-white' : 'bg-content2 text-foreground/70'
                        }`}>
                          <Icon size={24} />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className={`font-semibold ${isSelected ? 'text-primary' : ''}`}>
                            {preset.name}
                          </h3>
                          <p className="text-xs text-foreground/60 mt-1">
                            {preset.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="bg-primary text-white p-1 rounded-full">
                            <Check size={14} />
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  );
                })}
              </div>

              {/* Custom Settings Config (Only show if Custom is selected) */}
              {selectedPreset === 'custom' && (
                <div className="mt-4 p-4 bg-content2/50 rounded-lg border border-content3">
                  <h4 className="text-sm font-semibold mb-3">Custom Settings</h4>
                  <div className="flex gap-4">
                     {/* Simplified custom settings for MVP */}
                     <div className="text-xs text-foreground/60">
                        Manual configuration coming soon. Defaults to 1080p MP4.
                     </div>
                  </div>
                </div>
              )}
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
