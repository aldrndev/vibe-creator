import { Button, Tooltip } from "@heroui/react";
import { Upload, Download, Link, Mic, Type, Undo2, Redo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EditorHeaderProps {
  projectTitle: string;
  isExporting: boolean;
  exportProgress: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onEmulateImport: () => void; // Triggers file input click
  onImportUrl: () => void;
  onRecord: () => void;
  onAddText: () => void;
  onExport: () => void;
  onCancelExport: () => void;
}

export const EditorHeader = ({
  projectTitle,
  isExporting,
  exportProgress,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onEmulateImport,
  onImportUrl,
  onRecord,
  onAddText,
  onExport,
  onCancelExport,
}: EditorHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-divider flex items-center px-4 justify-between bg-content1 flex-shrink-0 z-20 overflow-x-auto no-scrollbar gap-4">
      <div className="flex items-center gap-4 flex-shrink-0">
        <Button
          size="sm"
          variant="light"
          onPress={() => navigate("/dashboard")}
          className="min-w-0 px-2"
        >
          ← <span className="hidden md:inline ml-1">Kembali</span>
        </Button>

        {/* Undo/Redo buttons */}
        <div className="hidden md:flex items-center gap-1 border-l border-divider pl-4">
          <Tooltip content="Undo (Ctrl+Z)">
            <Button
              size="sm"
              variant="light"
              isIconOnly
              isDisabled={!canUndo}
              onPress={onUndo}
            >
              <Undo2 size={16} />
            </Button>
          </Tooltip>
          <Tooltip content="Redo (Ctrl+Shift+Z)">
            <Button
              size="sm"
              variant="light"
              isIconOnly
              isDisabled={!canRedo}
              onPress={onRedo}
            >
              <Redo2 size={16} />
            </Button>
          </Tooltip>
        </div>

        <h1 className="text-lg font-semibold">{projectTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        {isExporting ? (
          <div className="flex items-center gap-3 px-4">
            <div className="text-sm text-foreground/70">
              Exporting... {Math.round(exportProgress * 100)}%
            </div>
            <div className="w-24 h-1 bg-default-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${exportProgress * 100}%` }}
              />
            </div>
            <Button
              size="sm"
              variant="flat"
              color="danger"
              onPress={onCancelExport}
            >
              Batal
            </Button>
          </div>
        ) : (
          <>
            <Button
              size="sm"
              variant="flat"
              startContent={<Upload size={16} />}
              onPress={onEmulateImport}
              className="min-w-0"
            >
              <span className="hidden md:inline">Import</span>
            </Button>
            <Button
              size="sm"
              variant="flat"
              startContent={<Link size={16} />}
              onPress={onImportUrl}
              className="min-w-0 hidden sm:flex"
            >
              <span className="hidden md:inline">Import URL</span>
            </Button>
            <Button
              size="sm"
              variant="flat"
              startContent={<Mic size={16} />}
              onPress={onRecord}
              className="min-w-0"
            >
              <span className="hidden md:inline">Record</span>
            </Button>
            <Button
              size="sm"
              variant="flat"
              startContent={<Type size={16} />}
              onPress={onAddText}
              className="min-w-0"
            >
              <span className="hidden md:inline">Add Text</span>
            </Button>
            <Button
              size="sm"
              color="primary"
              startContent={<Download size={16} />}
              onPress={onExport}
              className="min-w-0"
            >
              <span className="hidden md:inline">Export</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
};
