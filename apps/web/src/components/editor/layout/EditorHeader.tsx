import {
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui";
import {
  Upload,
  Link,
  Mic,
  Type,
  Undo2,
  Redo2,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
    <header className="h-14 md:h-16 border-b border-border bg-background flex items-center px-4 md:px-6 justify-between flex-shrink-0 z-30 gap-4">
      <div className="flex items-center gap-4 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="h-9 w-9 md:h-10 md:w-10 rounded-full hover:bg-muted transition-colors p-0"
        >
          <ChevronLeft size={20} className="text-muted-foreground" />
        </Button>

        <div className="flex flex-col">
          <h1 className="text-sm md:text-base font-semibold text-foreground truncate max-w-[150px] md:max-w-[300px]">
            {projectTitle || "Untitled Project"}
          </h1>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  disabled={!canUndo}
                  onClick={onUndo}
                  className={cn(
                    "p-1 hover:text-foreground transition-colors disabled:opacity-30",
                    canUndo ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Undo2 size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Undo (⌘Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  disabled={!canRedo}
                  onClick={onRedo}
                  className={cn(
                    "p-1 hover:text-foreground transition-colors disabled:opacity-30",
                    canRedo ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Redo2 size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isExporting ? (
          <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-1.5 border border-border">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Exporting
              </span>
              <span className="text-xs font-bold font-mono">
                {Math.round(exportProgress * 100)}%
              </span>
            </div>
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${exportProgress * 100}%` }}
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelExport}
              className="h-7 px-3 rounded-full text-[10px] font-bold uppercase text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 p-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={onEmulateImport}
                className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Upload size={16} className="md:mr-2" />
                <span className="hidden md:inline">Upload</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onImportUrl}
                className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Link size={16} className="md:mr-2" />
                <span className="hidden md:inline">Link</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRecord}
                className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hidden sm:flex"
              >
                <Mic size={16} className="md:mr-2" />
                <span className="hidden md:inline">Record</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onAddText}
                className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Type size={16} className="md:mr-2" />
                <span className="hidden md:inline">Text</span>
              </Button>
            </div>

            <Button
              size="sm"
              onClick={onExport}
              className="h-9 md:h-10 rounded-full px-4 md:px-6 font-bold text-xs"
            >
              <Zap size={16} className="mr-2 fill-current" />
              Export
            </Button>
          </>
        )}
      </div>
    </header>
  );
};
