/**
 * Asset Sidebar
 *
 * Upload zone and asset library for adding media to the editor.
 * Supports video, image, and audio files.
 */

import { Film, Mic2, Music, Shapes, Type, Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Tab,
  Tabs,
  TabsContent,
  TabsList,
} from '@/components/ui';
import { useVideoStudioAssets } from '@/hooks/use-video-studio-assets';
import { isMediaLibraryAsset } from '@/lib/modern-editor-asset-library';
import {
  buildTextQuickActionLayerUpdate,
  type VideoStudioTextAction,
  videoStudioOpeningClosingActionIds,
  videoStudioTextTemplateActionIds,
} from '@/lib/modern-editor-quick-actions';
import { cn } from '@/lib/utils';
import type { VideoStudioAsset } from '@/services/video-studio-assets-api';
import type { EditorAsset } from '@/stores/editor-store';
import { useModernEditorStore } from '@/stores/modern-editor-store';
import { AssetLibrary, AssetList } from './asset-sidebar-media-library';
import { QuickTextActions, TemplateActionGrid } from './asset-sidebar-quick-actions';
import { StudioAudioAssetList } from './asset-sidebar-studio-audio';
import { RecordVoiceDialog } from './record-voice-dialog';
import { useModernMediaImport } from './use-modern-media-import';

interface AssetSidebarProps {
  className?: string;
}

export function AssetSidebar({ className }: Readonly<AssetSidebarProps>) {
  const {
    assets,
    removeAsset,
    addAudioLayer,
    addAsset,
    addImageLayer,
    addSubtitleLayer,
    addTextLayer,
    addVideoLayer,
    settings,
    updateSettings,
    updateLayer,
  } = useModernEditorStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [assetPendingRemoval, setAssetPendingRemoval] = useState<EditorAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importFiles } = useModernMediaImport();
  const {
    audioAssets: studioAudioAssets,
    elementActions,
    isFallback,
    textActions,
  } = useVideoStudioAssets();

  const handleAddAssetToTimeline = useCallback(
    (asset: EditorAsset) => {
      if (asset.type === 'VIDEO') {
        addVideoLayer(asset.id);
        return;
      }

      if (asset.type === 'IMAGE') {
        addImageLayer(asset.id);
        return;
      }

      addAudioLayer(asset.id);
    },
    [addAudioLayer, addImageLayer, addVideoLayer],
  );

  const handleSetAsBackground = useCallback(
    (asset: EditorAsset) => {
      if (asset.type !== 'IMAGE') {
        return;
      }

      updateSettings({
        backgroundMode: 'image',
        backgroundImageAssetId: asset.id,
      });
    },
    [updateSettings],
  );

  const handleRemoveMediaAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find((candidate) => candidate.id === assetId);
      if (asset && asset.id === settings.backgroundImageAssetId) {
        setAssetPendingRemoval(asset);
        return;
      }

      removeAsset(assetId);
    },
    [assets, removeAsset, settings.backgroundImageAssetId],
  );

  const addStyledTextLayer = useCallback(
    (action: VideoStudioTextAction) => {
      const layerId = addTextLayer(action.text);
      const layer = useModernEditorStore.getState().layersById[layerId];

      if (layer?.type === 'text') {
        updateLayer(layerId, buildTextQuickActionLayerUpdate(layer, action));
      }
    },
    [addTextLayer, updateLayer],
  );

  const addStudioAudioAsset = useCallback(
    (studioAsset: VideoStudioAsset) => {
      const existingAsset = assets.find((asset) => asset.studioAssetId === studioAsset.id);
      if (existingAsset) {
        addAudioLayer(existingAsset.id);
        return;
      }

      const asset = createEditorAudioAssetFromStudioAsset(studioAsset);
      addAsset(asset);
      addAudioLayer(asset.id);
    },
    [addAsset, addAudioLayer, assets],
  );

  const addVoiceRecording = useCallback(
    ({ durationMs, file }: { durationMs: number; file: File }) => {
      const assetId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `voice-${Date.now()}`;
      const asset: EditorAsset = {
        id: assetId,
        name: file.name,
        type: 'AUDIO',
        libraryPurpose: 'media',
        url: URL.createObjectURL(file),
        durationMs,
        file,
      };

      addAsset(asset);
      addAudioLayer(asset.id);
    },
    [addAsset, addAudioLayer],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      void importFiles(e.dataTransfer.files);
    },
    [importFiles],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void importFiles(e.target.files);
      e.target.value = '';
    }
  };

  const mediaAssets = assets.filter(isMediaLibraryAsset);
  const videoAssets = mediaAssets.filter((a) => a.type === 'VIDEO');
  const imageAssets = mediaAssets.filter((a) => a.type === 'IMAGE');
  const audioAssets = mediaAssets.filter((a) => a.type === 'AUDIO');
  const primaryTextActions = textActions.filter((action) =>
    videoStudioOpeningClosingActionIds.includes(action.id),
  );
  const textTemplateActions = textActions.filter((action) =>
    videoStudioTextTemplateActionIds.includes(action.id),
  );

  return (
    <div className={cn('flex h-full flex-col overflow-hidden p-3', className)}>
      <Tabs defaultValue="media" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mb-3 grid h-10 shrink-0 grid-cols-4 gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
          <SidebarTab value="media" label="Media" icon={<Film size={14} />} />
          <SidebarTab value="text" label="Text" icon={<Type size={14} />} />
          <SidebarTab value="audio" label="Audio" icon={<Music size={14} />} />
          <SidebarTab value="elements" label="Elements" icon={<Shapes size={14} />} />
        </TabsList>

        <TabsContent
          value="media"
          className="min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <UploadCard
            fileInputRef={fileInputRef}
            inputId="media-upload"
            isDragging={isDragging}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onFileInput={handleFileInput}
          />
          <AssetLibrary
            allAssets={mediaAssets}
            audioAssets={audioAssets}
            imageAssets={imageAssets}
            videoAssets={videoAssets}
            onAdd={handleAddAssetToTimeline}
            onRemove={handleRemoveMediaAsset}
            onSetAsBackground={handleSetAsBackground}
          />
        </TabsContent>

        <TabsContent
          value="text"
          className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ScrollArea className="min-h-0 flex-1 pr-1.5">
            <QuickTextActions
              primaryTextActions={primaryTextActions}
              textTemplateActions={textTemplateActions}
              isUsingFallback={isFallback}
              onAddPlainText={addTextLayer}
              onAddStyledText={addStyledTextLayer}
              onAddSubtitle={addSubtitleLayer}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="audio"
          className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ScrollArea className="min-h-0 flex-1 pr-1.5">
            <UploadCard
              fileInputRef={fileInputRef}
              inputId="audio-upload"
              isDragging={isDragging}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onFileInput={handleFileInput}
            />
            <RecordVoiceCard onClick={() => setIsVoiceDialogOpen(true)} />
            <div className="mb-4">
              <AudioSectionTitle title="Audio Project" helper="Audio yang sudah masuk project." />
              <AssetList
                assets={audioAssets}
                emptyLabel="Belum ada audio project"
                onRemove={removeAsset}
                onAdd={handleAddAssetToTimeline}
                scrollable={false}
              />
            </div>
            <StudioAudioAssetList assets={studioAudioAssets} onAdd={addStudioAudioAsset} />
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="elements"
          className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ScrollArea className="min-h-0 flex-1 pr-1.5">
            <TemplateActionGrid
              title="Elemen Visual"
              helper="Tambahkan highlight, penanda, atau strip latar ke video."
              density="compact"
              actions={elementActions}
              onAdd={addStyledTextLayer}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
      <RecordVoiceDialog
        open={isVoiceDialogOpen}
        onOpenChange={setIsVoiceDialogOpen}
        onSave={addVoiceRecording}
      />
      <Dialog open={Boolean(assetPendingRemoval)} onOpenChange={() => setAssetPendingRemoval(null)}>
        <DialogContent className="rounded-2xl border-border/45 bg-card/95 p-0 backdrop-blur-xl sm:max-w-sm">
          <DialogHeader className="border-b border-border/35 p-5 pr-14">
            <DialogTitle className="text-base font-black">Hapus image ini?</DialogTitle>
            <DialogDescription className="mt-1 text-xs font-semibold">
              Image sedang dipakai sebagai background. Background canvas akan dilepas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 p-4 sm:space-x-0">
            <Button
              type="button"
              variant="ghost"
              className="h-10 flex-1 rounded-xl text-xs font-bold"
              onClick={() => setAssetPendingRemoval(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 flex-1 rounded-xl text-xs font-black"
              onClick={() => {
                if (assetPendingRemoval) {
                  removeAsset(assetPendingRemoval.id);
                }
                setAssetPendingRemoval(null);
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarTab({
  icon,
  label,
  value,
}: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <Tab
      value={value}
      className="flex items-center justify-center gap-1.5 rounded-lg px-1.5 py-1 text-[9px] font-black uppercase tracking-tight text-muted-foreground transition-all data-[state=active]:bg-card data-[state=active]:text-primary"
    >
      {icon}
      <span className="hidden min-[420px]:inline">{label}</span>
    </Tab>
  );
}

function createEditorAudioAssetFromStudioAsset(studioAsset: VideoStudioAsset): EditorAsset {
  const assetId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `studio-${studioAsset.id}-${Date.now()}`;

  return {
    id: assetId,
    name: studioAsset.title,
    type: 'AUDIO',
    libraryPurpose: 'media',
    url: studioAsset.previewUrl ?? '',
    durationMs: studioAsset.durationMs ?? undefined,
    serverUrl: studioAsset.previewUrl ?? undefined,
    studioAssetId: studioAsset.id,
  };
}

function RecordVoiceCard({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <Card className="mb-3 overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
      <CardBody className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Mic2 size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-tight">Record Voice</p>
            <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground/75">
              Rekam dubbing langsung dari mic.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 rounded-xl px-3 text-xs font-black"
            onClick={onClick}
          >
            Record
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function AudioSectionTitle({
  helper,
  title,
}: Readonly<{
  helper: string;
  title: string;
}>) {
  return (
    <div className="mb-2.5 px-1">
      <p className="text-xs font-black tracking-tight text-foreground">{title}</p>
      <p className="mt-0.5 text-[11px] font-semibold leading-snug text-muted-foreground/80">
        {helper}
      </p>
    </div>
  );
}

function UploadCard({
  fileInputRef,
  inputId,
  isDragging,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileInput,
}: Readonly<{
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  inputId: string;
  isDragging: boolean;
  onDragLeave: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
}>) {
  return (
    <Card
      className={cn(
        'group/upload relative mb-3 shrink-0 overflow-hidden rounded-xl border border-dashed transition-all',
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card/60',
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <CardBody className="p-3">
        <input
          ref={fileInputRef}
          type="file"
          id={inputId}
          className="hidden"
          multiple
          accept="video/*,image/*,audio/*"
          onChange={onFileInput}
        />
        <label htmlFor={inputId} className="flex cursor-pointer items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover/upload:scale-105">
            <Upload size={19} className="text-primary" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-bold tracking-tight">Upload Media</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
              Klik atau drop file
            </p>
          </div>
        </label>
      </CardBody>
    </Card>
  );
}
