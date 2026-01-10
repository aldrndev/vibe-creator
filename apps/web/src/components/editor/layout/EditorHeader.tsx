import {
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui";
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
  onEmulateImport: () => void;
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
    <TooltipProvider>
      <header className="h-14 border-b border-border flex items-center px-4 justify-between bg-card flex-shrink-0 z-20 overflow-x-auto no-scrollbar gap-4">
        <div className="flex items-center gap-4 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="min-w-0 px-2"
          >
            ← <span className="hidden md:inline ml-1">Kembali</span>
          </Button>

          {/* Undo/Redo buttons */}
          <div className="hidden md:flex items-center gap-1 border-l border-border pl-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!canUndo}
                  onClick={onUndo}
                >
                  <Undo2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!canRedo}
                  onClick={onRedo}
                >
                  <Redo2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>

          <h1 className="text-lg font-semibold">{projectTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          {isExporting ? (
            <div className="flex items-center gap-3 px-4">
              <div className="text-sm text-muted-foreground">
                Exporting... {Math.round(exportProgress * 100)}%
              </div>
              <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${exportProgress * 100}%` }}
                />
              </div>
              <Button size="sm" variant="secondary" onClick={onCancelExport}>
                Batal
              </Button>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={onEmulateImport}
                className="min-w-0"
              >
                <Upload size={16} />
                <span className="hidden md:inline">Import</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onImportUrl}
                className="min-w-0 hidden sm:flex"
              >
                <Link size={16} />
                <span className="hidden md:inline">Import URL</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onRecord}
                className="min-w-0"
              >
                <Mic size={16} />
                <span className="hidden md:inline">Record</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onAddText}
                className="min-w-0"
              >
                <Type size={16} />
                <span className="hidden md:inline">Add Text</span>
              </Button>
              <Button size="sm" onClick={onExport} className="min-w-0">
                <Download size={16} />
                <span className="hidden md:inline">Export</span>
              </Button>
            </>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
};
