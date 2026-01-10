/**
 * Asset Sidebar
 *
 * Upload zone and asset library for adding media to the editor.
 * Supports video, image, and audio files.
 */

import { useState, useCallback } from "react";
import {
  Card,
  CardBody,
  Button,
  Tabs,
  TabsList,
  Tab,
  TabsContent,
  ScrollArea,
} from "@/components/ui";
import {
  Upload,
  Video,
  Image as ImageIcon,
  Music,
  Type,
  Plus,
  Trash2,
  Film,
  Subtitles,
} from "lucide-react";
import { useModernEditorStore } from "@/stores/modern-editor-store";
import type { EditorAsset } from "@/stores/editor-store";
import { clsx } from "clsx";

interface AssetSidebarProps {
  className?: string;
}

export function AssetSidebar({ className }: AssetSidebarProps) {
  const {
    assets,
    addAsset,
    removeAsset,
    addVideoLayer,
    addImageLayer,
    addAudioLayer,
    addTextLayer,
    addSubtitleLayer,
  } = useModernEditorStore();

  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        const type = file.type.startsWith("video")
          ? "VIDEO"
          : file.type.startsWith("image")
          ? "IMAGE"
          : file.type.startsWith("audio")
          ? "AUDIO"
          : null;

        if (!type) continue;

        const url = URL.createObjectURL(file);

        let durationMs: number | undefined;
        let width: number | undefined;
        let height: number | undefined;

        if (type === "VIDEO" || type === "AUDIO") {
          durationMs = await getMediaDuration(file);
        }

        if (type === "VIDEO" || type === "IMAGE") {
          const dimensions = await getMediaDimensions(file, type);
          width = dimensions.width;
          height = dimensions.height;
        }

        const asset: EditorAsset = {
          id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type,
          url,
          file,
          durationMs,
          width,
          height,
        };

        addAsset(asset);

        if (type === "VIDEO") {
          addVideoLayer(asset.id);
        } else if (type === "IMAGE") {
          addImageLayer(asset.id);
        } else if (type === "AUDIO") {
          addAudioLayer(asset.id);
        }
      }
    },
    [addAsset, addVideoLayer, addImageLayer, addAudioLayer]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
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
    }
  };

  const videoAssets = assets.filter((a) => a.type === "VIDEO");
  const imageAssets = assets.filter((a) => a.type === "IMAGE");
  const audioAssets = assets.filter((a) => a.type === "AUDIO");

  return (
    <div className={clsx("flex flex-col h-full", className)}>
      {/* Upload Zone */}
      <Card
        className={clsx(
          "border-2 border-dashed transition-colors mb-4",
          isDragging ? "border-primary bg-primary/10" : "border-border"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardBody className="p-4 text-center">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept="video/*,image/*,audio/*"
            onChange={handleFileInput}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload size={24} className="text-primary" />
            </div>
            <p className="text-sm font-medium">
              Drop file atau klik untuk upload
            </p>
            <p className="text-xs text-muted-foreground">
              Video, Gambar, Audio
            </p>
          </label>
        </CardBody>
      </Card>

      {/* Quick Add Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => addTextLayer("Text")}
          className="flex-1"
        >
          <Type size={14} />
          Text
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => addSubtitleLayer("")}
          className="flex-1"
        >
          <Subtitles size={14} />
          Subtitle
        </Button>
      </div>

      {/* Asset Library */}
      <Card className="flex-1 overflow-hidden">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start">
            <Tab value="all">
              <Film size={14} />
              All ({assets.length})
            </Tab>
            <Tab value="video">
              <Video size={14} />
              {videoAssets.length}
            </Tab>
            <Tab value="image">
              <ImageIcon size={14} />
              {imageAssets.length}
            </Tab>
            <Tab value="audio">
              <Music size={14} />
              {audioAssets.length}
            </Tab>
          </TabsList>

          <TabsContent value="all">
            <AssetList
              assets={assets}
              onRemove={removeAsset}
              onAdd={(asset) => {
                if (asset.type === "VIDEO") addVideoLayer(asset.id);
                else if (asset.type === "IMAGE") addImageLayer(asset.id);
                else if (asset.type === "AUDIO") addAudioLayer(asset.id);
              }}
            />
          </TabsContent>
          <TabsContent value="video">
            <AssetList
              assets={videoAssets}
              onRemove={removeAsset}
              onAdd={(a) => addVideoLayer(a.id)}
            />
          </TabsContent>
          <TabsContent value="image">
            <AssetList
              assets={imageAssets}
              onRemove={removeAsset}
              onAdd={(a) => addImageLayer(a.id)}
            />
          </TabsContent>
          <TabsContent value="audio">
            <AssetList
              assets={audioAssets}
              onRemove={removeAsset}
              onAdd={(a) => addAudioLayer(a.id)}
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
}: {
  assets: EditorAsset[];
  onRemove: (id: string) => void;
  onAdd: (asset: EditorAsset) => void;
}) {
  if (assets.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Belum ada asset
      </div>
    );
  }

  const getIcon = (type: EditorAsset["type"]) => {
    switch (type) {
      case "VIDEO":
        return <Video size={16} />;
      case "IMAGE":
        return <ImageIcon size={16} />;
      case "AUDIO":
        return <Music size={16} />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <ScrollArea className="max-h-[300px] p-2">
      <div className="space-y-2">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
              {getIcon(asset.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{asset.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(asset.durationMs)}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => onAdd(asset)}
              >
                <Plus size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemove(asset.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Helper: Get media duration
async function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const element = file.type.startsWith("video")
      ? document.createElement("video")
      : document.createElement("audio");

    element.onloadedmetadata = () => {
      resolve(element.duration * 1000);
      URL.revokeObjectURL(url);
    };
    element.onerror = () => {
      resolve(5000);
      URL.revokeObjectURL(url);
    };
    element.src = url;
  });
}

// Helper: Get media dimensions
async function getMediaDimensions(
  file: File,
  type: "VIDEO" | "IMAGE"
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);

    if (type === "VIDEO") {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        URL.revokeObjectURL(url);
      };
      video.onerror = () => {
        resolve({ width: 1920, height: 1080 });
        URL.revokeObjectURL(url);
      };
      video.src = url;
    } else {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve({ width: 1920, height: 1080 });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  });
}
