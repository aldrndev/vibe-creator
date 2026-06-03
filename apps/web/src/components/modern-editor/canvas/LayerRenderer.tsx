import type { ImageLayer, Layer, TextLayer, VideoLayer } from '@vibe-creator/shared';
import { createDefaultVisualLayerEffects } from '@vibe-creator/shared';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { useLayerInteraction } from '@/hooks/useLayerInteraction';
import { getEditorFontPreviewFamily } from '@/lib/editor-font-loader';
import { resolveTextBackground } from '@/lib/modern-text-background';
import { LayerHandles } from './LayerHandles';
import { TypewriterPreviewText } from './typewriter-preview';
import { VideoLayerContent } from './VideoLayerContent';

interface LayerRendererProps {
  layer: Layer;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Layer>) => void;
  onDelete: () => void;
  assets: Array<{ id: string; url: string; type: string }>;
}

function getVisualFilterStyle(layer: ImageLayer | VideoLayer): CSSProperties {
  const effects = layer.data.effects ?? createDefaultVisualLayerEffects();

  switch (effects.filter) {
    case 'grayscale':
      return { filter: 'grayscale(1)' };
    case 'warm':
      return { filter: 'sepia(0.25) saturate(1.2) hue-rotate(-8deg)' };
    case 'cold':
      return { filter: 'saturate(1.08) hue-rotate(10deg)' };
    case 'vivid':
      return { filter: 'saturate(1.35) contrast(1.08)' };
    default:
      return {};
  }
}

function getVisualAnimation(layer: ImageLayer | VideoLayer) {
  const effects = layer.data.effects ?? createDefaultVisualLayerEffects();
  const initial = { opacity: 1, x: 0, scale: 1 };
  const animate = {
    opacity: 1,
    x: 0,
    scale: effects.motion === 'zoom-in' ? 1.04 : effects.motion === 'zoom-out' ? 0.96 : 1,
  };

  if (effects.transitionIn === 'fade') {
    initial.opacity = 0;
  } else if (effects.transitionIn === 'slide-left') {
    initial.x = -24;
    initial.opacity = 0;
  } else if (effects.transitionIn === 'slide-right') {
    initial.x = 24;
    initial.opacity = 0;
  } else if (effects.transitionIn === 'zoom') {
    initial.scale = 0.92;
    initial.opacity = 0;
  }

  return { initial, animate };
}

function getTextJustifyContent(textAlign: TextLayer['data']['textAlign']) {
  if (textAlign === 'left') {
    return 'flex-start';
  }

  if (textAlign === 'right') {
    return 'flex-end';
  }

  return 'center';
}

export function LayerRenderer({
  layer,
  scale,
  canvasWidth,
  canvasHeight,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  assets,
}: LayerRendererProps) {
  const {
    layerRef,
    isResizing,
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
  } = useLayerInteraction({
    layer,
    scale,
    canvasWidth,
    canvasHeight,
    onUpdate,
    onSelect,
    onDelete,
  });

  const getStyle = (): CSSProperties => {
    // Convert percentage to pixels
    const x = (layer.x / 100) * canvasWidth * scale;
    const y = (layer.y / 100) * canvasHeight * scale;
    const width = (layer.width / 100) * canvasWidth * scale;
    const height = (layer.height / 100) * canvasHeight * scale;

    // Center anchor
    const left = x - width / 2;
    const top = y - height / 2;

    return {
      position: 'absolute',
      left,
      top,
      width,
      height,
      transform: `rotate(${layer.rotation}deg)`,
      opacity: layer.opacity,
      cursor: layer.locked ? 'not-allowed' : 'move',
      outline: isSelected && !isEditing ? '1px solid hsl(var(--primary) / 0.82)' : 'none',
      outlineOffset: '1px',
      zIndex: isEditing ? 100 : undefined,
    };
  };

  const renderContent = () => {
    if (isEditing && layer.type === 'text') {
      const textLayer = layer as TextLayer;
      return (
        <textarea
          className="w-full h-full bg-transparent resize-none border-none outline-none overflow-hidden p-0 m-0"
          style={{
            fontFamily: getEditorFontPreviewFamily(textLayer.data.fontFamily),
            fontSize: textLayer.data.fontSize * scale,
            fontWeight: textLayer.data.fontWeight,
            fontStyle: textLayer.data.fontStyle,
            color: textLayer.data.color,
            textAlign: textLayer.data.textAlign,
            lineHeight: 1.2,
          }}
          value={textLayer.data.text}
          onChange={(e) =>
            onUpdate({
              data: { ...textLayer.data, text: e.target.value },
            } as Partial<TextLayer>)
          }
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              setIsEditing(false);
            }
          }}
        />
      );
    }

    switch (layer.type) {
      case 'video':
      case 'image': {
        const asset = assets.find((a) => a.id === layer.assetId);
        if (!asset) return null;
        const visualLayer = layer as ImageLayer | VideoLayer;
        const visualAnimation = getVisualAnimation(visualLayer);

        if (layer.type === 'video') {
          return (
            <motion.div
              initial={visualAnimation.initial}
              animate={visualAnimation.animate}
              transition={{ duration: 0.5 }}
              className="h-full w-full"
              style={getVisualFilterStyle(visualLayer)}
            >
              <VideoLayerContent
                src={asset.url}
                layerStartMs={layer.startMs}
                layerTrimStartMs={(layer as VideoLayer).data.trimStartMs}
                volume={(layer as VideoLayer).data.volume}
                fit={(layer as VideoLayer).data.fit}
                loop={(layer as VideoLayer).data.loop}
              />
            </motion.div>
          );
        }
        return (
          <motion.img
            src={asset.url}
            alt=""
            initial={visualAnimation.initial}
            animate={visualAnimation.animate}
            transition={{ duration: 0.5 }}
            style={getVisualFilterStyle(visualLayer)}
            className={clsx(
              'w-full h-full pointer-events-none',
              (layer as ImageLayer).data.fit === 'cover' ? 'object-cover' : 'object-contain',
            )}
          />
        );
      }
      case 'text': {
        const textLayer = layer as TextLayer;
        const animation = textLayer.data.animationIn ?? textLayer.data.animation;
        const loopAnimation = textLayer.data.animationLoop ?? 'none';
        const resolvedBackground = resolveTextBackground(textLayer.data);

        const variants: {
          initial: { opacity: number; y: number; scale?: number };
          animate: {
            opacity: number | number[];
            y: number;
            scale?: number | number[];
            x?: number[];
            textShadow?: string[];
          };
        } = {
          initial: { opacity: 0, y: 0 },
          animate: { opacity: 1, y: 0 },
        };

        if (animation === 'fade') {
          variants.initial = { opacity: 0, y: 0 };
        } else if (animation === 'slide-up') {
          variants.initial = { opacity: 0, y: 20 };
        } else if (animation === 'slide-down') {
          variants.initial = { opacity: 0, y: -20 };
        } else if (animation === 'pop') {
          variants.initial = { opacity: 0, y: 0, scale: 0.78 };
          variants.animate = { opacity: 1, y: 0, scale: 1 };
        } else if (animation === 'zoom') {
          variants.initial = { opacity: 0, y: 0, scale: 0.88 };
          variants.animate = { opacity: 1, y: 0, scale: 1 };
        } else if (animation === 'typewriter') {
          variants.initial = { opacity: 1, y: 0 };
        }

        if (animation === 'none') {
          variants.initial = { opacity: 1, y: 0 };
        }

        if (loopAnimation === 'pulse') {
          variants.animate.scale = [1, 1.04, 1];
        } else if (loopAnimation === 'shake') {
          variants.animate.x = [0, -3, 3, -2, 2, 0];
        } else if (loopAnimation === 'glow') {
          variants.animate.textShadow = [
            '0 0 0 rgba(255,255,255,0)',
            '0 0 12px rgba(255,255,255,0.7)',
            '0 0 0 rgba(255,255,255,0)',
          ];
        }

        return (
          <motion.div
            initial={animation !== 'none' ? variants.initial : undefined}
            animate={variants.animate}
            transition={{
              duration: loopAnimation === 'none' ? 0.5 : 1.2,
              repeat: loopAnimation === 'none' ? 0 : Number.POSITIVE_INFINITY,
            }}
            className="w-full h-full flex items-center justify-center overflow-hidden whitespace-pre-wrap break-words"
            style={{
              boxSizing: 'border-box',
              fontFamily: getEditorFontPreviewFamily(textLayer.data.fontFamily),
              fontSize: textLayer.data.fontSize * scale,
              fontWeight: textLayer.data.fontWeight,
              fontStyle: textLayer.data.fontStyle,
              color: textLayer.data.color,
              backgroundColor: resolvedBackground.cssColor,
              textAlign: textLayer.data.textAlign,
              justifyContent: getTextJustifyContent(textLayer.data.textAlign),
              paddingInline: textLayer.width <= 12 ? 0 : 8 * scale,
              lineHeight: 1.2,
            }}
          >
            {animation === 'typewriter' ? (
              <TypewriterPreviewText
                text={textLayer.data.text}
                layerDurationMs={textLayer.endMs - textLayer.startMs}
              />
            ) : (
              textLayer.data.text
            )}
          </motion.div>
        );
      }
      case 'audio':
        return null; // Should be handled by AudioLayerContent list outside
      default:
        return null;
    }
  };

  // Skip audio layers in renderer
  if (layer.type === 'audio') return null;

  return (
    <div
      ref={layerRef}
      role="option"
      tabIndex={0}
      aria-selected={isSelected}
      style={getStyle()}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={clsx('select-none group', isResizing && 'pointer-events-none')}
    >
      {renderContent()}

      {/* Handles */}
      {isSelected && !layer.locked && !isEditing && (
        <LayerHandles
          onRotateMouseDown={handleRotateStart}
          onRotateTouchStart={handleRotateTouchStart}
          onResizeMouseDown={handleResizeStart}
          onResizeTouchStart={handleResizeTouchStart}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
