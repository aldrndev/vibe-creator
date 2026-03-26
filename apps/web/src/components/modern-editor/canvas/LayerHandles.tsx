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
        className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-move group/rotate pointer-events-auto"
        onMouseDown={onRotateMouseDown}
        onTouchStart={onRotateTouchStart}
      >
        <div className="bg-white text-black p-1 rounded-full shadow-md border border-gray-200 hover:scale-110 transition-transform hover:bg-gray-50">
          <RotateCw size={12} strokeWidth={2.5} />
        </div>
        <div className="w-px h-4 bg-[#0099ff]" />
      </button>

      {/* Delete Button */}
      <button
        type="button"
        className="absolute -top-10 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 hover:scale-110 transition-all pointer-events-auto"
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
        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-[#0099ff] rounded-full cursor-nw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-10"
        onMouseDown={(e) => onResizeMouseDown(e, 'nw')}
        onTouchStart={(e) => onResizeTouchStart(e, 'nw')}
      />
      <button
        type="button"
        aria-label="Resize layer from north-east"
        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-[#0099ff] rounded-full cursor-ne-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-10"
        onMouseDown={(e) => onResizeMouseDown(e, 'ne')}
        onTouchStart={(e) => onResizeTouchStart(e, 'ne')}
      />
      <button
        type="button"
        aria-label="Resize layer from south-west"
        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-[#0099ff] rounded-full cursor-sw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-10"
        onMouseDown={(e) => onResizeMouseDown(e, 'sw')}
        onTouchStart={(e) => onResizeTouchStart(e, 'sw')}
      />
      <button
        type="button"
        aria-label="Resize layer from south-east"
        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-[#0099ff] rounded-full cursor-se-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-10"
        onMouseDown={(e) => onResizeMouseDown(e, 'se')}
        onTouchStart={(e) => onResizeTouchStart(e, 'se')}
      />

      {/* Side Handles */}
      <button
        type="button"
        aria-label="Resize layer from north"
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-2 bg-white border border-[#0099ff] rounded-full cursor-n-resize pointer-events-auto shadow-sm hover:bg-[#0099ff] transition-colors"
        onMouseDown={(e) => onResizeMouseDown(e, 'n')}
        onTouchStart={(e) => onResizeTouchStart(e, 'n')}
      />
      <button
        type="button"
        aria-label="Resize layer from south"
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-2 bg-white border border-[#0099ff] rounded-full cursor-s-resize pointer-events-auto shadow-sm hover:bg-[#0099ff] transition-colors"
        onMouseDown={(e) => onResizeMouseDown(e, 's')}
        onTouchStart={(e) => onResizeTouchStart(e, 's')}
      />
      <button
        type="button"
        aria-label="Resize layer from west"
        className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-5 bg-white border border-[#0099ff] rounded-full cursor-w-resize pointer-events-auto shadow-sm hover:bg-[#0099ff] transition-colors"
        onMouseDown={(e) => onResizeMouseDown(e, 'w')}
        onTouchStart={(e) => onResizeTouchStart(e, 'w')}
      />
      <button
        type="button"
        aria-label="Resize layer from east"
        className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-5 bg-white border border-[#0099ff] rounded-full cursor-e-resize pointer-events-auto shadow-sm hover:bg-[#0099ff] transition-colors"
        onMouseDown={(e) => onResizeMouseDown(e, 'e')}
        onTouchStart={(e) => onResizeTouchStart(e, 'e')}
      />
    </>
  );
}
