import type { Layer, TextLayer } from '@vibe-creator/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

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
      // Rotation Logic
      if (isRotating && layerRef.current) {
        const rect = layerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let angleDeg = angleRad * (180 / Math.PI);

        angleDeg += 90;

        onUpdate({ rotation: angleDeg });
        return;
      }

      if (!isDragging && !isResizing) return;

      const dxPx = e.clientX - dragStart.x;
      const dyPx = e.clientY - dragStart.y;

      const dx = (dxPx / (canvasWidth * scale)) * 100;
      const dy = (dyPx / (canvasHeight * scale)) * 100;

      if (isDragging) {
        onUpdate({
          x: layerStart.x + dx,
          y: layerStart.y + dy,
        });
      } else if (isResizing) {
        let newWidth = layerStart.width;
        let newHeight = layerStart.height;
        let newFontSize = layerStart.fontSize;

        // Corner scaling
        if (['nw', 'ne', 'sw', 'se'].includes(isResizing)) {
          let widthChange = 0;
          if (isResizing.includes('e')) widthChange = dx;
          else widthChange = -dx;

          const scaleFactor = Math.max(0.1, (layerStart.width + widthChange) / layerStart.width);

          newWidth = layerStart.width * scaleFactor;
          newHeight = layerStart.height * scaleFactor;

          if (layer.type === 'text') {
            newFontSize = layerStart.fontSize * scaleFactor;
          }
        }
        // Side stretching
        else {
          if (isResizing === 'e') {
            newWidth = Math.max(1, layerStart.width + dx);
            onUpdate({ x: layerStart.x + dx / 2 });
          } else if (isResizing === 'w') {
            newWidth = Math.max(1, layerStart.width - dx);
            onUpdate({ x: layerStart.x + dx / 2 });
          } else if (isResizing === 's') {
            newHeight = Math.max(1, layerStart.height + dy);
            onUpdate({ y: layerStart.y + dy / 2 });
          } else if (isResizing === 'n') {
            newHeight = Math.max(1, layerStart.height - dy);
            onUpdate({ y: layerStart.y + dy / 2 });
          }
        }

        const updates: Partial<Layer> = {
          width: newWidth,
          height: newHeight,
        };

        if (layer.type === 'text' && Math.abs(newFontSize - layerStart.fontSize) > 0.1) {
          (updates as Partial<TextLayer>).data = {
            ...layer.data,
            fontSize: newFontSize,
          };
        }

        onUpdate(updates);
      }
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
      layer.type,
      layer.data,
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

      if (isRotating && layerRef.current) {
        const rect = layerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angleRad = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
        let angleDeg = angleRad * (180 / Math.PI);
        angleDeg += 90;
        onUpdate({ rotation: angleDeg });
        return;
      }

      if (!isDragging && !isResizing) return;

      const dxPx = touch.clientX - dragStart.x;
      const dyPx = touch.clientY - dragStart.y;
      const dx = (dxPx / (canvasWidth * scale)) * 100;
      const dy = (dyPx / (canvasHeight * scale)) * 100;

      if (isDragging) {
        onUpdate({
          x: layerStart.x + dx,
          y: layerStart.y + dy,
        });
      } else if (isResizing) {
        // ... (Similar touch logic for resize - simplification: reusing logic via abstraction or copy)
        // For brevity and robustness, we'll conceptually reuse the same logic block.
        // But to keep hooks clean, let's just copy the block for now or assume identical behavior to mouse.
        // (Copying minimal version for safety)
        let newWidth = layerStart.width;
        let newHeight = layerStart.height;
        let newFontSize = layerStart.fontSize;

        if (
          isResizing === 'nw' ||
          isResizing === 'ne' ||
          isResizing === 'sw' ||
          isResizing === 'se'
        ) {
          let widthChange = 0;
          if (isResizing.includes('e')) widthChange = dx;
          else widthChange = -dx;
          const scaleFactor = Math.max(0.1, (layerStart.width + widthChange) / layerStart.width);
          newWidth = layerStart.width * scaleFactor;
          newHeight = layerStart.height * scaleFactor;
          if (layer.type === 'text') newFontSize = layerStart.fontSize * scaleFactor;
        } else {
          if (isResizing === 'e') {
            newWidth = Math.max(1, layerStart.width + dx);
            onUpdate({ x: layerStart.x + dx / 2 });
          } else if (isResizing === 'w') {
            newWidth = Math.max(1, layerStart.width - dx);
            onUpdate({ x: layerStart.x + dx / 2 });
          } else if (isResizing === 's') {
            newHeight = Math.max(1, layerStart.height + dy);
            onUpdate({ y: layerStart.y + dy / 2 });
          } else if (isResizing === 'n') {
            newHeight = Math.max(1, layerStart.height - dy);
            onUpdate({ y: layerStart.y + dy / 2 });
          }
        }

        const updates: Partial<Layer> = {
          width: newWidth,
          height: newHeight,
        };

        if (layer.type === 'text' && Math.abs(newFontSize - layerStart.fontSize) > 0.1) {
          (updates as Partial<TextLayer>).data = {
            ...layer.data,
            fontSize: newFontSize,
          };
        }

        onUpdate(updates);
      }
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
      layer.type,
      layer.data,
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
