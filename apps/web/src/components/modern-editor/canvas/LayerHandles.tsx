import { RotateCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayerHandlesProps {
  onRotateMouseDown: (e: React.MouseEvent) => void;
  onRotateTouchStart: (e: React.TouchEvent) => void;
  onResizeMouseDown: (e: React.MouseEvent, handle: string) => void;
  onResizeTouchStart: (e: React.TouchEvent, handle: string) => void;
  onDelete: () => void;
}

export function LayerHandles({
  onRotateMouseDown,
  onRotateTouchStart,
  onResizeMouseDown,
  onResizeTouchStart,
  onDelete,
}: LayerHandlesProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Rotate layer"
        className="group/rotate pointer-events-auto absolute -top-11 left-1/2 z-20 flex h-11 w-11 -translate-x-1/2 cursor-grab touch-manipulation items-center justify-center active:cursor-grabbing"
        onMouseDown={onRotateMouseDown}
        onTouchStart={onRotateTouchStart}
      >
        <span className="pointer-events-none absolute top-9 h-3 w-px bg-primary/35" />
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/35 bg-background/90 text-primary shadow-sm backdrop-blur-md transition-all group-hover/rotate:scale-105 group-hover/rotate:border-primary/65 group-hover/rotate:bg-primary/10">
          <RotateCw size={13} strokeWidth={2.4} />
        </span>
      </button>

      <button
        type="button"
        className="group/delete pointer-events-auto absolute -top-11 -right-5 z-20 flex h-11 w-11 touch-manipulation items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete layer"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/45 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-md transition-all group-hover/delete:scale-105 group-hover/delete:border-destructive/55 group-hover/delete:bg-destructive/10 group-hover/delete:text-destructive">
          <Trash2 size={13} strokeWidth={2.4} />
        </span>
      </button>

      <ResizeHandle
        ariaLabel="Resize layer from north-west"
        cursorClassName="cursor-nw-resize"
        handle="nw"
        positionClassName="-top-5 -left-5"
        variant="corner"
        onResizeMouseDown={onResizeMouseDown}
        onResizeTouchStart={onResizeTouchStart}
      />
      <ResizeHandle
        ariaLabel="Resize layer from north-east"
        cursorClassName="cursor-ne-resize"
        handle="ne"
        positionClassName="-top-5 -right-5"
        variant="corner"
        onResizeMouseDown={onResizeMouseDown}
        onResizeTouchStart={onResizeTouchStart}
      />
      <ResizeHandle
        ariaLabel="Resize layer from south-west"
        cursorClassName="cursor-sw-resize"
        handle="sw"
        positionClassName="-bottom-5 -left-5"
        variant="corner"
        onResizeMouseDown={onResizeMouseDown}
        onResizeTouchStart={onResizeTouchStart}
      />
      <ResizeHandle
        ariaLabel="Resize layer from south-east"
        cursorClassName="cursor-se-resize"
        handle="se"
        positionClassName="-right-5 -bottom-5"
        variant="corner"
        onResizeMouseDown={onResizeMouseDown}
        onResizeTouchStart={onResizeTouchStart}
      />

      <ResizeHandle
        ariaLabel="Resize layer from north"
        cursorClassName="cursor-n-resize"
        handle="n"
        positionClassName="-top-5 left-1/2 -translate-x-1/2"
        variant="horizontal"
        onResizeMouseDown={onResizeMouseDown}
        onResizeTouchStart={onResizeTouchStart}
      />
      <ResizeHandle
        ariaLabel="Resize layer from south"
        cursorClassName="cursor-s-resize"
        handle="s"
        positionClassName="-bottom-5 left-1/2 -translate-x-1/2"
        variant="horizontal"
        onResizeMouseDown={onResizeMouseDown}
        onResizeTouchStart={onResizeTouchStart}
      />
      <ResizeHandle
        ariaLabel="Resize layer from west"
        cursorClassName="cursor-w-resize"
        handle="w"
        positionClassName="-left-5 top-1/2 -translate-y-1/2"
        variant="vertical"
        onResizeMouseDown={onResizeMouseDown}
        onResizeTouchStart={onResizeTouchStart}
      />
      <ResizeHandle
        ariaLabel="Resize layer from east"
        cursorClassName="cursor-e-resize"
        handle="e"
        positionClassName="-right-5 top-1/2 -translate-y-1/2"
        variant="vertical"
        onResizeMouseDown={onResizeMouseDown}
        onResizeTouchStart={onResizeTouchStart}
      />
    </>
  );
}

interface ResizeHandleProps {
  readonly ariaLabel: string;
  readonly cursorClassName: string;
  readonly handle: string;
  readonly positionClassName: string;
  readonly variant: 'corner' | 'horizontal' | 'vertical';
  readonly onResizeMouseDown: (e: React.MouseEvent, handle: string) => void;
  readonly onResizeTouchStart: (e: React.TouchEvent, handle: string) => void;
}

function ResizeHandle({
  ariaLabel,
  cursorClassName,
  handle,
  positionClassName,
  variant,
  onResizeMouseDown,
  onResizeTouchStart,
}: ResizeHandleProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        'group/resize pointer-events-auto absolute z-10 flex h-11 w-11 touch-manipulation items-center justify-center',
        cursorClassName,
        positionClassName,
      )}
      onMouseDown={(e) => onResizeMouseDown(e, handle)}
      onTouchStart={(e) => onResizeTouchStart(e, handle)}
    >
      <span
        className={cn(
          'block border border-primary/80 bg-background/95 shadow-sm transition-all group-hover/resize:scale-110 group-hover/resize:bg-primary',
          variant === 'corner' && 'h-3 w-3 rounded-full',
          variant === 'horizontal' && 'h-1.5 w-7 rounded-full',
          variant === 'vertical' && 'h-7 w-1.5 rounded-full',
        )}
      />
    </button>
  );
}
