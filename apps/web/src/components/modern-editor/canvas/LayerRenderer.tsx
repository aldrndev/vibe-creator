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
    scale: (() => {
      if (effects.motion === 'zoom-in') return 1.04;
      if (effects.motion === 'zoom-out') return 0.96;
      return 1;
    })(),
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

  function VisualLayerRenderer({
    layer,
    asset,
  }: {
    layer: ImageLayer | VideoLayer;
    asset: { url: string };
  }) {
    const visualAnimation = getVisualAnimation(layer);

    if (layer.type === 'video') {
      return (
        <motion.div
          initial={visualAnimation.initial}
          animate={visualAnimation.animate}
          transition={{ duration: 0.5 }}
          className="h-full w-full"
          style={getVisualFilterStyle(layer)}
        >
          <VideoLayerContent
            src={asset.url}
            layerStartMs={layer.startMs}
            layerTrimStartMs={layer.data.trimStartMs}
            volume={layer.data.volume}
            fit={layer.data.fit}
            loop={layer.data.loop}
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
        style={getVisualFilterStyle(layer)}
        className={clsx(
          'w-full h-full pointer-events-none',
          layer.data.fit === 'cover' ? 'object-cover' : 'object-contain',
        )}
      />
    );
  }

  function getBaseTextAnimationVariants(animation: string) {
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

    switch (animation) {
      case 'fade':
        variants.initial = { opacity: 0, y: 0 };
        break;
      case 'slide-up':
        variants.initial = { opacity: 0, y: 20 };
        break;
      case 'slide-down':
        variants.initial = { opacity: 0, y: -20 };
        break;
      case 'pop':
        variants.initial = { opacity: 0, y: 0, scale: 0.78 };
        variants.animate = { opacity: 1, y: 0, scale: 1 };
        break;
      case 'zoom':
        variants.initial = { opacity: 0, y: 0, scale: 0.88 };
        variants.animate = { opacity: 1, y: 0, scale: 1 };
        break;
      case 'typewriter':
      case 'none':
        variants.initial = { opacity: 1, y: 0 };
        break;
    }
    return variants;
  }

  type TextAnimationVariants = {
    initial: { opacity: number; y: number; scale?: number };
    animate: {
      opacity: number | number[];
      y: number;
      scale?: number | number[];
      x?: number[];
      textShadow?: string[];
    };
  };

  function applyTextLoopAnimationVariants(variants: TextAnimationVariants, loopAnimation: string) {
    switch (loopAnimation) {
      case 'pulse':
        variants.animate.scale = [1, 1.04, 1];
        break;
      case 'shake':
        variants.animate.x = [0, -3, 3, -2, 2, 0];
        break;
      case 'glow':
        variants.animate.textShadow = [
          '0 0 0 rgba(255,255,255,0)',
          '0 0 12px rgba(255,255,255,0.7)',
          '0 0 0 rgba(255,255,255,0)',
        ];
        break;
    }
  }

  function getTextAnimationVariants(textLayer: TextLayer) {
    const animation = textLayer.data.animationIn ?? textLayer.data.animation;
    const loopAnimation = textLayer.data.animationLoop ?? 'none';

    const variants = getBaseTextAnimationVariants(animation);
    applyTextLoopAnimationVariants(variants, loopAnimation);

    return variants;
  }

  function TextLayerRenderer({ layer, scale }: { layer: TextLayer; scale: number }) {
    const animation = layer.data.animationIn ?? layer.data.animation;
    const loopAnimation = layer.data.animationLoop ?? 'none';
    const resolvedBackground = resolveTextBackground(layer.data);
    const variants = getTextAnimationVariants(layer);

    return (
      <motion.div
        initial={animation === 'none' ? undefined : variants.initial}
        animate={variants.animate}
        transition={{
          duration: loopAnimation === 'none' ? 0.5 : 1.2,
          repeat: loopAnimation === 'none' ? 0 : Number.POSITIVE_INFINITY,
        }}
        className="w-full h-full flex items-center justify-center overflow-hidden whitespace-pre-wrap"
        style={{
          boxSizing: 'border-box',
          fontFamily: getEditorFontPreviewFamily(layer.data.fontFamily),
          fontSize: layer.data.fontSize * scale,
          fontWeight: layer.data.fontWeight,
          fontStyle: layer.data.fontStyle,
          color: layer.data.color,
          backgroundColor: resolvedBackground.cssColor,
          textAlign: layer.data.textAlign,
          justifyContent: getTextJustifyContent(layer.data.textAlign),
          paddingInline: layer.width <= 12 ? 0 : 8 * scale,
          lineHeight: 1.2,
        }}
      >
        {animation === 'typewriter' ? (
          <TypewriterPreviewText
            text={layer.data.text}
            layerDurationMs={layer.endMs - layer.startMs}
          />
        ) : (
          layer.data.text
        )}
      </motion.div>
    );
  }

  function TextEditorTextarea({
    layer,
    scale,
    onUpdate,
    setIsEditing,
  }: {
    layer: TextLayer;
    scale: number;
    onUpdate: (updates: Partial<Layer>) => void;
    setIsEditing: (editing: boolean) => void;
  }) {
    return (
      <textarea
        className="w-full h-full bg-transparent resize-none border-none outline-none overflow-hidden p-0 m-0"
        style={{
          fontFamily: getEditorFontPreviewFamily(layer.data.fontFamily),
          fontSize: layer.data.fontSize * scale,
          fontWeight: layer.data.fontWeight,
          fontStyle: layer.data.fontStyle,
          color: layer.data.color,
          textAlign: layer.data.textAlign,
          lineHeight: 1.2,
        }}
        value={layer.data.text}
        onChange={(e) =>
          onUpdate({
            data: { ...layer.data, text: e.target.value },
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

  const renderContent = () => {
    if (isEditing && layer.type === 'text') {
      return (
        <TextEditorTextarea
          layer={layer as TextLayer}
          scale={scale}
          onUpdate={onUpdate}
          setIsEditing={setIsEditing}
        />
      );
    }

    switch (layer.type) {
      case 'video':
      case 'image': {
        const asset = assets.find((a) => a.id === layer.assetId);
        if (!asset) return null;
        return <VisualLayerRenderer layer={layer as ImageLayer | VideoLayer} asset={asset} />;
      }
      case 'text':
        return <TextLayerRenderer layer={layer as TextLayer} scale={scale} />;
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
