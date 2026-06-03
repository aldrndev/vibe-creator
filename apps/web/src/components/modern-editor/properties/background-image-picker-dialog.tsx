import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
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
import {
  type BackgroundImagePickerSource,
  groupBackgroundImageAssets,
  resolveBackgroundImagePickerSource,
} from '@/lib/modern-editor-asset-library';
import { cn } from '@/lib/utils';
import type { EditorAsset } from '@/stores/editor-store';
import { useModernMediaImport } from '../use-modern-media-import';

interface BackgroundImagePickerDialogProps {
  readonly activeAssetId?: string | null;
  readonly assets: readonly EditorAsset[];
  readonly onActiveAssetDeleted: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRemoveAsset: (assetId: string) => void;
  readonly onUseAsset: (asset: EditorAsset) => void;
  readonly open: boolean;
}

export function BackgroundImagePickerDialog({
  activeAssetId,
  assets,
  onActiveAssetDeleted,
  onOpenChange,
  onRemoveAsset,
  onUseAsset,
  open,
}: Readonly<BackgroundImagePickerDialogProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { importFiles } = useModernMediaImport({ libraryPurpose: 'background' });
  const { backgroundUploads, mediaImages } = groupBackgroundImageAssets(assets);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [pendingDeleteAssetId, setPendingDeleteAssetId] = useState<string | null>(null);
  const [source, setSource] = useState<BackgroundImagePickerSource>('background');
  const activeSource = resolveBackgroundImagePickerSource(activeAssetId, mediaImages);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedAssetId(activeAssetId ?? null);
    setPendingDeleteAssetId(null);
    setSource(activeSource);
  }, [activeAssetId, activeSource, open]);

  const selectedAsset = assets.find(
    (asset) => asset.id === selectedAssetId && asset.type === 'IMAGE',
  );
  const pendingDeleteAsset = backgroundUploads.find((asset) => asset.id === pendingDeleteAssetId);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const importedAssets = await importFiles(
      Array.from(files).filter((file) => file.type.startsWith('image/')),
    );
    const uploadedImage = importedAssets.find((asset) => asset.type === 'IMAGE');
    if (uploadedImage) {
      setSource('background');
      setSelectedAssetId(uploadedImage.id);
    }
  };

  const deleteBackgroundUpload = () => {
    if (!pendingDeleteAsset) {
      return;
    }

    const wasActive = pendingDeleteAsset.id === activeAssetId;
    onRemoveAsset(pendingDeleteAsset.id);
    if (selectedAssetId === pendingDeleteAsset.id) {
      setSelectedAssetId(null);
    }
    setPendingDeleteAssetId(null);

    if (wasActive) {
      onActiveAssetDeleted();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(82vh,680px)] max-h-[min(82vh,680px)] flex-col gap-0 overflow-hidden rounded-2xl border-border/45 bg-card/95 p-0 backdrop-blur-xl max-sm:bottom-0 max-sm:top-auto max-sm:h-[min(86vh,680px)] max-sm:max-h-[min(86vh,680px)] max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-xl">
        <DialogHeader className="border-b border-border/35 p-5 pr-14">
          <DialogTitle className="text-lg font-black tracking-tight">Choose Background</DialogTitle>
          <DialogDescription className="mt-1 text-xs font-semibold">
            Upload khusus background atau gunakan image dari Media.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleUpload(event.target.files);
            event.target.value = '';
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-center rounded-xl border-primary/25 text-xs font-black text-primary"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={15} className="mr-2" />
            Upload Background
          </Button>

          <Tabs
            value={source}
            onValueChange={(value) => setSource(value as BackgroundImagePickerSource)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="grid h-10 shrink-0 grid-cols-2 rounded-xl border border-border/30 bg-background/25 p-1">
              <Tab value="background" className="rounded-lg text-xs font-bold">
                Background Uploads
              </Tab>
              <Tab value="media" className="rounded-lg text-xs font-bold">
                Media Images
              </Tab>
            </TabsList>
            <TabsContent
              value="background"
              className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
            >
              <BackgroundImageGrid
                assets={backgroundUploads}
                emptyLabel="Belum ada upload background."
                selectedAssetId={selectedAssetId}
                onDelete={setPendingDeleteAssetId}
                onSelect={setSelectedAssetId}
              />
            </TabsContent>
            <TabsContent
              value="media"
              className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
            >
              <BackgroundImageGrid
                assets={mediaImages}
                emptyLabel="Belum ada image di Media."
                selectedAssetId={selectedAssetId}
                onSelect={setSelectedAssetId}
              />
            </TabsContent>
          </Tabs>

          {pendingDeleteAsset && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3">
              <p className="text-xs font-bold text-foreground">Hapus background upload ini?</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
                {pendingDeleteAsset.name}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg text-xs font-bold"
                  onClick={() => setPendingDeleteAssetId(null)}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 rounded-lg text-xs font-bold"
                  onClick={deleteBackgroundUpload}
                >
                  Hapus
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 border-t border-border/35 p-4 sm:justify-end sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            className="h-10 flex-1 rounded-xl text-xs font-bold sm:flex-none"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 flex-1 rounded-xl text-xs font-black sm:flex-none"
            disabled={!selectedAsset}
            onClick={() => {
              if (selectedAsset) {
                onUseAsset(selectedAsset);
              }
            }}
          >
            Use as Background
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BackgroundImageGrid({
  assets,
  emptyLabel,
  onDelete,
  onSelect,
  selectedAssetId,
}: Readonly<{
  assets: readonly EditorAsset[];
  emptyLabel: string;
  onDelete?: (assetId: string) => void;
  onSelect: (assetId: string) => void;
  selectedAssetId: string | null;
}>) {
  if (assets.length === 0) {
    return (
      <div className="flex h-full min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border/40 text-center text-muted-foreground">
        <ImagePlus size={20} className="mb-2 opacity-60" />
        <p className="text-xs font-bold">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1 pr-1">
      <div className="grid grid-cols-2 gap-2 pb-1">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={cn(
              'overflow-hidden rounded-xl border bg-background/25 transition-colors',
              selectedAssetId === asset.id
                ? 'border-primary bg-primary/10'
                : 'border-border/35 hover:border-primary/45',
            )}
          >
            <button
              type="button"
              className="w-full text-left"
              aria-label={`Select ${asset.name}`}
              onClick={() => onSelect(asset.id)}
            >
              <img
                src={asset.thumbnailUrl ?? asset.url}
                alt=""
                className="h-24 w-full object-cover"
              />
              <p className="truncate px-2 pt-2 text-xs font-bold text-foreground">{asset.name}</p>
            </button>
            <div className="flex h-9 items-center justify-between px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Image
              </span>
              {onDelete && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  aria-label={`Hapus ${asset.name}`}
                  onClick={() => onDelete(asset.id)}
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
