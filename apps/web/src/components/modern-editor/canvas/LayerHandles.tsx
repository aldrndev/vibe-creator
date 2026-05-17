import { RotateCw, X } from 'lucide-react';

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
      {/* Rotation Handle */}
      <button
        type="button"
        aria-label="Rotate layer"
        className="absolute -top-12 left-1/2 -translate-x-1/2 flex cursor-move touch-manipulation flex-col items-center pointer-events-auto"
        onMouseDown={onRotateMouseDown}
        onTouchStart={onRotateTouchStart}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-background text-primary shadow-md transition-transform hover:scale-110">
          <RotateCw size={12} strokeWidth={2.5} />
        </div>
        <div className="h-4 w-px bg-primary/70" />
      </button>

      {/* Delete Button */}
      <button
        type="button"
        className="absolute -top-12 -right-3 flex h-8 w-8 touch-manipulation items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-all hover:scale-110 hover:bg-destructive/90 pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete layer"
      >
        <X size={12} strokeWidth={2.5} />
      </button>

      {/* RESIZE HANDLES */}
      {/* Corner Handles */}
      <button
        type="button"
        aria-label="Resize layer from north-west"
        className="absolute -top-2 -left-2 z-10 h-4 w-4 touch-manipulation rounded-full border border-primary bg-background shadow-sm transition-transform hover:scale-125 cursor-nw-resize pointer-events-auto"
        onMouseDown={(e) => onResizeMouseDown(e, 'nw')}
        onTouchStart={(e) => onResizeTouchStart(e, 'nw')}
      />
      <button
        type="button"
        aria-label="Resize layer from north-east"
        className="absolute -top-2 -right-2 z-10 h-4 w-4 touch-manipulation rounded-full border border-primary bg-background shadow-sm transition-transform hover:scale-125 cursor-ne-resize pointer-events-auto"
        onMouseDown={(e) => onResizeMouseDown(e, 'ne')}
        onTouchStart={(e) => onResizeTouchStart(e, 'ne')}
      />
      <button
        type="button"
        aria-label="Resize layer from south-west"
        className="absolute -bottom-2 -left-2 z-10 h-4 w-4 touch-manipulation rounded-full border border-primary bg-background shadow-sm transition-transform hover:scale-125 cursor-sw-resize pointer-events-auto"
        onMouseDown={(e) => onResizeMouseDown(e, 'sw')}
        onTouchStart={(e) => onResizeTouchStart(e, 'sw')}
      />
      <button
        type="button"
        aria-label="Resize layer from south-east"
        className="absolute -bottom-2 -right-2 z-10 h-4 w-4 touch-manipulation rounded-full border border-primary bg-background shadow-sm transition-transform hover:scale-125 cursor-se-resize pointer-events-auto"
        onMouseDown={(e) => onResizeMouseDown(e, 'se')}
        onTouchStart={(e) => onResizeTouchStart(e, 'se')}
      />

      {/* Side Handles */}
      <button
        type="button"
        aria-label="Resize layer from north"
        className="absolute -top-1.5 left-1/2 h-3 w-8 -translate-x-1/2 touch-manipulation rounded-full border border-primary bg-background shadow-sm transition-colors hover:bg-primary cursor-n-resize pointer-events-auto"
        onMouseDown={(e) => onResizeMouseDown(e, 'n')}
        onTouchStart={(e) => onResizeTouchStart(e, 'n')}
      />
      <button
        type="button"
        aria-label="Resize layer from south"
        className="absolute -bottom-1.5 left-1/2 h-3 w-8 -translate-x-1/2 touch-manipulation rounded-full border border-primary bg-background shadow-sm transition-colors hover:bg-primary cursor-s-resize pointer-events-auto"
        onMouseDown={(e) => onResizeMouseDown(e, 's')}
        onTouchStart={(e) => onResizeTouchStart(e, 's')}
      />
      <button
        type="button"
        aria-label="Resize layer from west"
        className="absolute -left-1.5 top-1/2 h-8 w-3 -translate-y-1/2 touch-manipulation rounded-full border border-primary bg-background shadow-sm transition-colors hover:bg-primary cursor-w-resize pointer-events-auto"
        onMouseDown={(e) => onResizeMouseDown(e, 'w')}
        onTouchStart={(e) => onResizeTouchStart(e, 'w')}
      />
      <button
        type="button"
        aria-label="Resize layer from east"
        className="absolute -right-1.5 top-1/2 h-8 w-3 -translate-y-1/2 touch-manipulation rounded-full border border-primary bg-background shadow-sm transition-colors hover:bg-primary cursor-e-resize pointer-events-auto"
        onMouseDown={(e) => onResizeMouseDown(e, 'e')}
        onTouchStart={(e) => onResizeTouchStart(e, 'e')}
      />
    </>
  );
}
