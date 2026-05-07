/**
 * Asset Sidebar
 *
 * Upload zone and asset library for adding media to the editor.
 * Supports video, image, and audio files.
 */

import {
  Film,
  Image as ImageIcon,
  Music,
  Plus,
  Subtitles,
  Trash2,
  Type,
  Upload,
  Video,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  ScrollArea,
  Tab,
  Tabs,
  TabsContent,
  TabsList,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import type { EditorAsset } from '@/stores/editor-store';
import { useModernEditorStore } from '@/stores/modern-editor-store';

interface AssetSidebarProps {
  className?: string;
}

export function AssetSidebar({ className }: Readonly<AssetSidebarProps>) {
  const {
    assets,
    addAsset,
    removeAsset,
    addAudioLayer,
    addImageLayer,
    addSubtitleLayer,
    addTextLayer,
    addVideoLayer,
  } = useModernEditorStore();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFiles = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        let type: EditorAsset['type'] | null = null;
        if (file.type.startsWith('video')) type = 'VIDEO';
        else if (file.type.startsWith('image')) type = 'IMAGE';
        else if (file.type.startsWith('audio')) type = 'AUDIO';

        if (!type) continue;

        const url = URL.createObjectURL(file);

        // Basic Metadata Extraction
        let durationMs = 5000;
        let width = 0;
        let height = 0;

        if (type === 'VIDEO' || type === 'AUDIO') {
          const el = document.createElement(type === 'VIDEO' ? 'video' : 'audio');
          el.src = url;
          await new Promise<void>((resolve) => {
            el.onloadedmetadata = () => {
              durationMs = el.duration * 1000;
              if (type === 'VIDEO') {
                width = (el as HTMLVideoElement).videoWidth;
                height = (el as HTMLVideoElement).videoHeight;
              }
              resolve();
            };
            el.onerror = () => resolve();
          });
        } else if (type === 'IMAGE') {
          const img = new Image();
          img.src = url;
          await new Promise<void>((resolve) => {
            img.onload = () => {
              width = img.width;
              height = img.height;
              resolve();
            };
            img.onerror = () => resolve();
          });
        }

        const asset: EditorAsset = {
          id: crypto.randomUUID(),
          name: file.name,
          type,
          url,
          file,
          durationMs,
          width,
          height,
        };

        addAsset(asset);
      }
    },
    [addAsset],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
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
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const videoAssets = assets.filter((a) => a.type === 'VIDEO');
  const imageAssets = assets.filter((a) => a.type === 'IMAGE');
  const audioAssets = assets.filter((a) => a.type === 'AUDIO');

  return (
    <div className={cn('flex flex-col h-full overflow-hidden p-4', className)}>
      {/* Upload Zone - More compact on mobile */}
      <Card
        className={cn(
          'border-2 border-dashed transition-all mb-4 md:mb-6 rounded-2xl group/upload relative overflow-hidden shrink-0',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card/60',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardBody className="p-4 md:p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept="video/*,image/*,audio/*"
            onChange={handleFileInput}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2 md:gap-4"
          >
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center transition-transform group-hover/upload:scale-110 duration-300">
              <Upload size={20} className="text-primary md:w-7 md:h-7" />
            </div>
            <div className="space-y-0.5 md:space-y-1">
              <p className="text-xs md:text-sm font-bold tracking-tight">Upload Media</p>
              <p className="hidden md:block text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">
                Video • Gambar • Audio
              </p>
            </div>
          </label>
        </CardBody>
      </Card>

      {/* Quick Add Buttons - Placeholder or connect to actual handlers later */}
      <div className="flex gap-3 mb-4 md:mb-6 shrink-0">
        <Button
          size="sm"
          className="flex-1 rounded-xl font-bold h-9 md:h-10 border-border/40 bg-card/50 hover:bg-card/70 backdrop-blur-sm"
          variant="outline"
          onClick={() => addTextLayer('Text layer')}
        >
          <Type size={14} className="mr-2 text-primary md:w-4 md:h-4" />
          Text
        </Button>
        <Button
          size="sm"
          className="flex-1 rounded-xl font-bold h-9 md:h-10 border-border/40 bg-card/50 hover:bg-card/70 backdrop-blur-sm"
          variant="outline"
          onClick={() => addSubtitleLayer('Subtitle text...')}
        >
          <Subtitles size={14} className="mr-2 text-primary md:w-4 md:h-4" />
          Subtitle
        </Button>
      </div>

      {/* Asset Library */}
      <Card className="flex-1 overflow-hidden border-border/40 bg-card/70 rounded-2xl flex flex-col min-h-0">
        <Tabs defaultValue="all" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-between gap-1 p-1 bg-muted/20 border-b border-border/40 h-12 shrink-0 overflow-x-auto scrollbar-hide">
            <Tab
              value="all"
              className="px-4 py-1.5 rounded-xl transition-all data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-bold flex items-center gap-2 shrink-0"
            >
              <Film size={14} />
              All
              <span className="opacity-40 text-[10px] ml-0.5">{assets.length}</span>
            </Tab>
            <Tab
              value="video"
              className="px-3 py-1.5 rounded-xl transition-all data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-bold flex items-center gap-2 shrink-0"
            >
              <Video size={14} />
              <span className="opacity-40 text-[10px]">{videoAssets.length}</span>
            </Tab>
            <Tab
              value="image"
              className="px-3 py-1.5 rounded-xl transition-all data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-bold flex items-center gap-2 shrink-0"
            >
              <ImageIcon size={14} />
              <span className="opacity-40 text-[10px]">{imageAssets.length}</span>
            </Tab>
            <Tab
              value="audio"
              className="px-3 py-1.5 rounded-xl transition-all data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-bold flex items-center gap-2 shrink-0"
            >
              <Music size={14} />
              <span className="opacity-40 text-[10px]">{audioAssets.length}</span>
            </Tab>
          </TabsList>

          <TabsContent
            value="all"
            className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <AssetList assets={assets} onRemove={removeAsset} onAdd={handleAddAssetToTimeline} />
          </TabsContent>
          <TabsContent
            value="video"
            className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <AssetList
              assets={videoAssets}
              onRemove={removeAsset}
              onAdd={handleAddAssetToTimeline}
            />
          </TabsContent>
          <TabsContent
            value="image"
            className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <AssetList
              assets={imageAssets}
              onRemove={removeAsset}
              onAdd={handleAddAssetToTimeline}
            />
          </TabsContent>
          <TabsContent
            value="audio"
            className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <AssetList
              assets={audioAssets}
              onRemove={removeAsset}
              onAdd={handleAddAssetToTimeline}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

// Asset list component
function AssetList({
  assets,
  onRemove,
  onAdd,
}: Readonly<{
  assets: EditorAsset[];
  onRemove: (id: string) => void;
  onAdd: (asset: EditorAsset) => void;
}>) {
  const getIcon = (type: EditorAsset['type']) => {
    switch (type) {
      case 'VIDEO':
        return <Video size={16} />;
      case 'IMAGE':
        return <ImageIcon size={16} />;
      case 'AUDIO':
        return <Music size={16} />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollArea className="flex-1 p-4">
      <ul className="space-y-4">
        {assets.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Belum ada asset</div>
        ) : (
          assets.map((asset) => (
            <li key={asset.id} className="list-none">
              <button
                type="button"
                onClick={() => onAdd(asset)}
                className="group flex flex-col w-full text-left gap-3 p-4 rounded-2xl bg-card/50 border border-border/40 hover:bg-card/70 hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
              >
                {/* Top row: Icon and text information */}
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors shrink-0 border border-border/40">
                    {getIcon(asset.type)}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-bold line-clamp-1 tracking-tight text-foreground transition-colors group-hover:text-primary mb-1.5 break-all">
                      {asset.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-black uppercase tracking-widest px-2 h-5 border-primary/20 bg-primary/5 text-primary/80"
                      >
                        {asset.type}
                      </Badge>
                      {asset.durationMs && (
                        <p className="text-[10px] font-bold text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded">
                          {formatDuration(asset.durationMs)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom row / Actions: Prominent buttons */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/10 opacity-60 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    Klik untuk tambah ke studio
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(asset.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </ScrollArea>
  );
}
