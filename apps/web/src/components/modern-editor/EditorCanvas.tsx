/**
 * Editor Canvas
 *
 * Main editing canvas showing layer previews with click-to-select.
 * Displays video/image/text layers with proper z-ordering.
 */

import type {
  AudioLayer,
  ImageLayer,
  Layer,
  ModernProjectSettings,
  VideoLayer,
} from '@vibe-creator/shared';
import { FileUp, Grid2X2, Maximize2, Type } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import {
  buildTextQuickActionLayerUpdate,
  getTextQuickAction,
} from '@/lib/modern-editor-quick-actions';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';
import { AudioLayerContent } from './canvas/AudioLayerContent';
import { LayerRenderer } from './canvas/LayerRenderer';
import { VideoLayerContent } from './canvas/VideoLayerContent';
import { useModernMediaImport } from './use-modern-media-import';

interface EditorCanvasProps {
  readonly className?: string;
  readonly isFocusMode?: boolean;
}

type CanvasZoomMode = 'fit' | 'manual';

const CANVAS_FIT_PADDING_PX = 64;
const CANVAS_FOCUS_FIT_PADDING_PX = 36;
const CANVAS_ZOOM_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
] as const;

export function EditorCanvas({ className, isFocusMode = false }: Readonly<EditorCanvasProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<CanvasZoomMode>('fit');
  const [manualScale, setManualScale] = useState(1);
  const [showGuides, setShowGuides] = useState(true);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const { importFiles } = useModernMediaImport({ autoAddToCanvas: true });

  const {
    settings,
    layerOrder,
    layersById,
    selectedLayerId,
    selectedLayerIds,
    selectLayer,
    addTextLayer,
    updateLayer,
    removeLayer,
    setCurrentTime,
    currentTimeMs,
    assets,
  } = useModernEditorStore();

  const scale = zoomMode === 'fit' ? fitScale : manualScale;
  const isManualOverflow = zoomMode === 'manual' && manualScale > fitScale;

  // Calculate scale to fit canvas in container
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const padding = isFocusMode ? CANVAS_FOCUS_FIT_PADDING_PX : CANVAS_FIT_PADDING_PX;
      const containerWidth = containerRef.current.clientWidth - padding;
      const containerHeight = containerRef.current.clientHeight - padding;

      const scaleX = containerWidth / settings.width;
      const scaleY = containerHeight / settings.height;
      setFitScale(Math.max(0.05, Math.min(scaleX, scaleY, 1)));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isFocusMode, settings.width, settings.height]);

  const allLayers = layerOrder
    .map((id) => layersById[id])
    .filter((layer): layer is Layer => Boolean(layer));
  const visibleLayers = allLayers.filter(
    (layer) => layer.visible && currentTimeMs >= layer.startMs && currentTimeMs < layer.endMs,
  );
  const hasLayers = allLayers.length > 0;
  const hasSelectedLayers = Boolean(selectedLayerId || selectedLayerIds.length > 0);
  const shouldShowGuides = showGuides && hasSelectedLayers;
  const blurBackgroundLayer =
    settings.backgroundMode === 'blur'
      ? ([...visibleLayers]
          .filter(
            (layer): layer is ImageLayer | VideoLayer =>
              (layer.type === 'image' || layer.type === 'video') && Boolean(layer.assetId),
          )
          .sort((left, right) => left.zIndex - right.zIndex)[0] ?? null)
      : null;
  const blurBackgroundAsset = blurBackgroundLayer
    ? assets.find((asset) => asset.id === blurBackgroundLayer.assetId)
    : null;
  const imageBackgroundAsset =
    settings.backgroundMode === 'image' && settings.backgroundImageAssetId
      ? assets.find(
          (asset) => asset.id === settings.backgroundImageAssetId && asset.type === 'IMAGE',
        )
      : null;

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectLayer(null);
    }
  };

  const handleStartFromTemplate = () => {
    const action = getTextQuickAction('title');
    const layerId = addTextLayer(action.text);
    const layer = useModernEditorStore.getState().layersById[layerId];

    if (layer?.type === 'text') {
      updateLayer(layerId, buildTextQuickActionLayerUpdate(layer, action));
    }
  };

  const handleJumpToFirstLayer = () => {
    const firstStartMs = allLayers.reduce(
      (earliest, layer) => Math.min(earliest, layer.startMs),
      Number.POSITIVE_INFINITY,
    );

    if (Number.isFinite(firstStartMs)) {
      setCurrentTime(firstStartMs);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingFile(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDraggingFile(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);

    if (event.dataTransfer.files.length > 0) {
      void importFiles(event.dataTransfer.files);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      void importFiles(event.target.files);
      event.target.value = '';
    }
  };

  return (
    <section
      ref={containerRef}
      aria-label="Video editor canvas drop zone"
      className={cn(
        'relative flex-1 overflow-auto bg-muted/20',
        'bg-[radial-gradient(hsl(var(--muted-foreground)/0.1)_1px,transparent_1px)] bg-size-[28px_28px]',
        isDraggingFile && 'bg-primary/10',
        className,
      )}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="video/*,image/*,audio/*"
        onChange={handleFileInput}
      />
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex min-h-10 items-center gap-2 rounded-xl border border-border/50 bg-card/90 px-2 py-1 shadow-sm backdrop-blur-xl">
          <Maximize2 size={15} className="ml-1 text-primary" />
          <label className="sr-only" htmlFor="video-studio-canvas-zoom">
            Canvas zoom
          </label>
          <select
            id="video-studio-canvas-zoom"
            className="h-8 rounded-xl border border-border/50 bg-background px-3 text-xs font-bold text-foreground outline-none transition-colors focus:border-primary"
            value={zoomMode === 'fit' ? 'fit' : manualScale.toString()}
            onChange={(event) => {
              if (event.target.value === 'fit') {
                setZoomMode('fit');
                return;
              }

              setZoomMode('manual');
              setManualScale(Number(event.target.value));
            }}
          >
            <option value="fit">Fit</option>
            {CANVAS_ZOOM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant={showGuides ? 'secondary' : 'ghost'}
            size="sm"
            aria-label={showGuides ? 'Hide canvas guides' : 'Show canvas guides'}
            className="h-8 rounded-lg px-2.5 text-[11px] font-black"
            onClick={() => setShowGuides((value) => !value)}
          >
            <Grid2X2 size={14} />
            Guides
          </Button>
        </div>

        <div className="pointer-events-none rounded-2xl border border-border/50 bg-card/85 px-3 py-2 text-[11px] font-black text-muted-foreground shadow-sm backdrop-blur-xl">
          {settings.width}x{settings.height} @ {Math.round(scale * 100)}%
        </div>
      </div>
      <button
        type="button"
        aria-label="Deselect selected layer"
        className="absolute inset-0 z-0 cursor-default"
        onClick={handleCanvasClick}
      />

      <div
        className={cn(
          'relative z-10 flex min-h-full min-w-full p-6 pt-16',
          isManualOverflow ? 'items-start justify-start' : 'items-center justify-center',
        )}
      >
        {/* Canvas */}
        <div
          className="relative overflow-hidden bg-black shadow-2xl shadow-black/25 ring-1 ring-border/40"
          style={{
            width: settings.width * scale,
            height: settings.height * scale,
            backgroundColor: '#000000',
          }}
        >
          <CanvasBackgroundLayer
            blurLayer={blurBackgroundLayer}
            blurSourceUrl={blurBackgroundAsset?.url}
            imageSourceUrl={imageBackgroundAsset?.url}
            settings={settings}
          />

          {shouldShowGuides && <CanvasGuides />}

          {/* Audio Layers (Invisible) */}
          {visibleLayers
            .filter((l) => l.type === 'audio')
            .map((layer) => (
              <AudioLayerContent
                key={layer.id}
                layer={layer as AudioLayer}
                assets={assets}
                layerStartMs={layer.startMs}
              />
            ))}

          {/* Visual Layers */}
          {visibleLayers.map((layer) => (
            <LayerRenderer
              key={layer.id}
              layer={layer}
              scale={scale}
              canvasWidth={settings.width}
              canvasHeight={settings.height}
              isSelected={selectedLayerId === layer.id || selectedLayerIds.includes(layer.id)}
              onSelect={() => selectLayer(layer.id)}
              onUpdate={(updates) => updateLayer(layer.id, updates)}
              onDelete={() => removeLayer(layer.id)}
              assets={assets}
            />
          ))}

          {/* Empty state */}
          {visibleLayers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-muted-foreground">
              {!hasLayers ? (
                <div
                  className={cn(
                    'flex max-w-[300px] flex-col items-center gap-3 rounded-2xl border border-dashed border-transparent px-6 py-6 text-center transition-all',
                    isDraggingFile && 'border-primary/50 bg-primary/10 text-foreground',
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <FileUp size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">
                      {isDraggingFile ? 'Lepas file di sini' : 'Mulai dari media'}
                    </p>
                    <p className="mt-1 text-sm">Drop video, gambar, atau audio ke canvas</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-10 rounded-xl px-4 font-bold"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileUp size={15} className="mr-2" />
                      Upload
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-10 rounded-xl border-border/50 px-4 font-bold"
                      onClick={handleStartFromTemplate}
                    >
                      <Type size={15} className="mr-2 text-primary" />
                      Title
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex max-w-[280px] flex-col items-center gap-3 rounded-2xl border border-border/40 bg-card/90 px-5 py-5 text-center shadow-xl backdrop-blur">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Grid2X2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">
                      Tidak ada layer di detik ini
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Geser playhead atau lompat ke layer pertama.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-10 rounded-xl px-4 font-bold"
                    onClick={handleJumpToFirstLayer}
                  >
                    Ke layer pertama
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CanvasGuides() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      <div className="absolute inset-[8%] border border-dashed border-primary/35" />
      <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-primary/25" />
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-primary/25" />
    </div>
  );
}

function CanvasBackgroundLayer({
  blurLayer,
  blurSourceUrl,
  imageSourceUrl,
  settings,
}: Readonly<{
  blurLayer: ImageLayer | VideoLayer | null;
  blurSourceUrl?: string;
  imageSourceUrl?: string;
  settings: ModernProjectSettings;
}>) {
  const opacity = settings.backgroundOpacity ?? 1;

  if (settings.backgroundMode === 'image') {
    const dim = settings.backgroundImageDim ?? 0;
    return (
      <>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: settings.backgroundColor }}
        />
        {imageSourceUrl && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity }}>
            <img
              src={imageSourceUrl}
              alt=""
              className="absolute inset-0 h-full w-full"
              style={{
                filter: `blur(${Math.round(settings.backgroundImageBlurAmount ?? 0)}px)`,
                objectFit: settings.backgroundImageFit ?? 'cover',
                objectPosition: `${settings.backgroundImagePositionX ?? 50}% ${settings.backgroundImagePositionY ?? 50}%`,
                transform: `scale(${settings.backgroundImageScale ?? 1})`,
              }}
            />
            {dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />}
          </div>
        )}
      </>
    );
  }

  if (settings.backgroundMode === 'gradient') {
    return (
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(${settings.backgroundGradientAngle ?? 135}deg, ${settings.backgroundGradientFrom ?? '#111827'}, ${settings.backgroundGradientTo ?? '#ff4b1f'})`,
          opacity,
        }}
      />
    );
  }

  if (settings.backgroundMode === 'blur' && blurLayer && blurSourceUrl) {
    return (
      <CanvasBlurBackground
        layer={blurLayer}
        opacity={opacity}
        settings={settings}
        src={blurSourceUrl}
      />
    );
  }

  if (settings.backgroundMode === 'solid') {
    return (
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: settings.backgroundColor, opacity }}
      />
    );
  }

  return null;
}

function CanvasBlurBackground({
  layer,
  opacity,
  settings,
  src,
}: Readonly<{
  layer: ImageLayer | VideoLayer;
  opacity: number;
  settings: {
    backgroundBlurAmount?: number;
    backgroundBlurZoom?: number;
    backgroundDim?: number;
    backgroundSaturation?: number;
  };
  src: string;
}>) {
  const blurAmount = Math.round(settings.backgroundBlurAmount ?? 18);
  const zoom = settings.backgroundBlurZoom ?? 1.08;
  const dim = settings.backgroundDim ?? 0.08;
  const saturation = settings.backgroundSaturation ?? 1.05;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity }}>
      <div
        className="absolute inset-0"
        style={{
          filter: `blur(${blurAmount}px) saturate(${saturation})`,
          transform: `scale(${zoom})`,
        }}
      >
        {layer.type === 'video' ? (
          <VideoLayerContent
            src={src}
            layerStartMs={layer.startMs}
            layerTrimStartMs={layer.data.trimStartMs}
            volume={0}
            fit="cover"
            loop={layer.data.loop}
          />
        ) : (
          <img src={src} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgba(0,0,0,0.16)_100%)]" />
      <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />
    </div>
  );
}
