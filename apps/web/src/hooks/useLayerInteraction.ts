import type { Layer, TextLayer } from '@vibe-creator/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

function calculateRotation(clientX: number, clientY: number, layerElement: HTMLElement) {
  const rect = layerElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
  let angleDeg = angleRad * (180 / Math.PI);
  angleDeg += 90;
  return angleDeg;
}

interface LayerStart {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontSize: number;
}

function calculateCornerResize(
  isResizing: string,
  dx: number,
  layerStart: LayerStart,
  layer: Layer,
  onUpdate: (updates: Partial<Layer>) => void,
) {
  const widthChange = isResizing.includes('e') ? dx : -dx;
  const scaleFactor = Math.max(0.1, (layerStart.width + widthChange) / layerStart.width);
  const newWidth = layerStart.width * scaleFactor;
  const newHeight = layerStart.height * scaleFactor;

  const updates: Partial<Layer> = { width: newWidth, height: newHeight };
  if (layer.type === 'text') {
    const newFontSize = layerStart.fontSize * scaleFactor;
    if (Math.abs(newFontSize - layerStart.fontSize) > 0.1) {
      (updates as Partial<TextLayer>).data = { ...layer.data, fontSize: newFontSize };
    }
  }
  onUpdate(updates);
}

function calculateSideResize(
  isResizing: string,
  dx: number,
  dy: number,
  layerStart: LayerStart,
  onUpdate: (updates: Partial<Layer>) => void,
) {
  let newWidth = layerStart.width;
  let newHeight = layerStart.height;

  if (isResizing === 'e') {
    newWidth = Math.max(1, layerStart.width + dx);
    onUpdate({ x: layerStart.x + dx / 2, width: newWidth });
  } else if (isResizing === 'w') {
    newWidth = Math.max(1, layerStart.width - dx);
    onUpdate({ x: layerStart.x + dx / 2, width: newWidth });
  } else if (isResizing === 's') {
    newHeight = Math.max(1, layerStart.height + dy);
    onUpdate({ y: layerStart.y + dy / 2, height: newHeight });
  } else if (isResizing === 'n') {
    newHeight = Math.max(1, layerStart.height - dy);
    onUpdate({ y: layerStart.y + dy / 2, height: newHeight });
  }
}

function calculateResize(
  isResizing: string,
  dx: number,
  dy: number,
  layerStart: LayerStart,
  layer: Layer,
  onUpdate: (updates: Partial<Layer>) => void,
) {
  if (['nw', 'ne', 'sw', 'se'].includes(isResizing)) {
    calculateCornerResize(isResizing, dx, layerStart, layer, onUpdate);
  } else {
    calculateSideResize(isResizing, dx, dy, layerStart, onUpdate);
  }
}

function processInteraction(
  clientX: number,
  clientY: number,
  state: {
    isRotating: boolean;
    isDragging: boolean;
    isResizing: string | null;
    dragStart: { x: number; y: number };
    layerStart: LayerStart;
    layerElement: HTMLElement | null;
    canvasWidth: number;
    canvasHeight: number;
    scale: number;
    layer: Layer;
  },
  onUpdate: (updates: Partial<Layer>) => void,
) {
  const {
    isRotating,
    isDragging,
    isResizing,
    dragStart,
    layerStart,
    layerElement,
    canvasWidth,
    canvasHeight,
    scale,
    layer,
  } = state;

  if (isRotating && layerElement) {
    onUpdate({ rotation: calculateRotation(clientX, clientY, layerElement) });
    return;
  }

  if (!isDragging && !isResizing) return;

  const dxPx = clientX - dragStart.x;
  const dyPx = clientY - dragStart.y;
  const dx = (dxPx / (canvasWidth * scale)) * 100;
  const dy = (dyPx / (canvasHeight * scale)) * 100;

  if (isDragging) {
    onUpdate({
      x: layerStart.x + dx,
      y: layerStart.y + dy,
    });
  } else if (isResizing) {
    calculateResize(isResizing, dx, dy, layerStart, layer, onUpdate);
  }
}

interface UseLayerInteractionProps {
  layer: Layer;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  onUpdate: (updates: Partial<Layer>) => void;
  onSelect: () => void;
  onDelete: () => void;
}

export function useLayerInteraction({
  layer,
  scale,
  canvasWidth,
  canvasHeight,
  onUpdate,
  onSelect,
}: UseLayerInteractionProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layerStart, setLayerStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    fontSize: 0,
  });

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setLayerStart({
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation,
      fontSize: layer.type === 'text' ? (layer as TextLayer).data.fontSize : 0,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (layer.locked || isEditing) return;
    e.stopPropagation();
    onSelect();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (layer.locked || isEditing) return;
    e.stopPropagation();
    onSelect();
    const touch = e.touches[0];
    if (!touch) return;
    handleDragStart(touch.clientX, touch.clientY);
  };

  const handleResizeStartRaw = (clientX: number, clientY: number, handle: string) => {
    setIsResizing(handle);
    setDragStart({ x: clientX, y: clientY });
    setLayerStart({
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation,
      fontSize: layer.type === 'text' ? (layer as TextLayer).data.fontSize : 0,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    handleResizeStartRaw(e.clientX, e.clientY, handle);
  };

  const handleResizeTouchStart = (e: React.TouchEvent, handle: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;
    handleResizeStartRaw(touch.clientX, touch.clientY, handle);
  };

  const handleRotateStartRaw = () => {
    setIsRotating(true);
  };

  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleRotateStartRaw();
  };

  const handleRotateTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsRotating(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      processInteraction(
        e.clientX,
        e.clientY,
        {
          isRotating,
          isDragging,
          isResizing,
          dragStart,
          layerStart,
          layerElement: layerRef.current,
          canvasWidth,
          canvasHeight,
          scale,
          layer,
        },
        onUpdate,
      );
    },
    [
      isDragging,
      isResizing,
      isRotating,
      dragStart,
      layerStart,
      canvasWidth,
      canvasHeight,
      scale,
      onUpdate,
      layer,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    setIsRotating(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      processInteraction(
        touch.clientX,
        touch.clientY,
        {
          isRotating,
          isDragging,
          isResizing,
          dragStart,
          layerStart,
          layerElement: layerRef.current,
          canvasWidth,
          canvasHeight,
          scale,
          layer,
        },
        onUpdate,
      );
    },
    [
      isDragging,
      isResizing,
      isRotating,
      dragStart,
      layerStart,
      canvasWidth,
      canvasHeight,
      scale,
      onUpdate,
      layer,
    ],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    setIsRotating(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing || isRotating) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [
    isDragging,
    isResizing,
    isRotating,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (layer.type === 'text' && !layer.locked) {
      setIsEditing(true);
    }
  };

  return {
    layerRef,
    isDragging,
    isResizing,
    isRotating,
    isEditing,
    setIsEditing,
    handleMouseDown,
    handleTouchStart,
    handleClick,
    handleDoubleClick,
    handleResizeStart,
    handleResizeTouchStart,
    handleRotateStart,
    handleRotateTouchStart,
  };
}
