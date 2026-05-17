import { Film, Image as ImageIcon, Layers3, Music, Plus, Trash2, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, Button, Card, ScrollArea, Tab, Tabs, TabsContent, TabsList } from '@/components/ui';
import type { EditorAsset } from '@/stores/editor-store';

interface AssetLibraryProps {
  readonly allAssets: EditorAsset[];
  readonly audioAssets: EditorAsset[];
  readonly imageAssets: EditorAsset[];
  readonly videoAssets: EditorAsset[];
  readonly onAdd: (asset: EditorAsset) => void;
  readonly onRemove: (id: string) => void;
}

interface AssetListProps {
  readonly assets: EditorAsset[];
  readonly emptyLabel?: string;
  readonly onRemove: (id: string) => void;
  readonly onAdd: (asset: EditorAsset) => void;
  readonly scrollable?: boolean;
}

/**
 * Tabbed media library for reusable video, image, and audio assets.
 */
export function AssetLibrary({
  allAssets,
  audioAssets,
  imageAssets,
  videoAssets,
  onAdd,
  onRemove,
}: AssetLibraryProps) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-border/40 bg-card/70">
      <Tabs defaultValue="all" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="h-10 w-full shrink-0 justify-between gap-1 overflow-x-auto border-b border-border/40 bg-muted/20 p-1 scrollbar-hide">
          <MediaFilterTab
            value="all"
            icon={<Film size={14} />}
            count={allAssets.length}
            label="All"
          />
          <MediaFilterTab value="video" icon={<Video size={14} />} count={videoAssets.length} />
          <MediaFilterTab value="image" icon={<ImageIcon size={14} />} count={imageAssets.length} />
          <MediaFilterTab value="audio" icon={<Music size={14} />} count={audioAssets.length} />
        </TabsList>

        <AssetTabContent value="all" assets={allAssets} onRemove={onRemove} onAdd={onAdd} />
        <AssetTabContent value="video" assets={videoAssets} onRemove={onRemove} onAdd={onAdd} />
        <AssetTabContent value="image" assets={imageAssets} onRemove={onRemove} onAdd={onAdd} />
        <AssetTabContent value="audio" assets={audioAssets} onRemove={onRemove} onAdd={onAdd} />
      </Tabs>
    </Card>
  );
}

export function AssetList({
  assets,
  emptyLabel = 'Belum ada asset',
  onRemove,
  onAdd,
  scrollable = true,
}: AssetListProps) {
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

  const content = (
    <ul className="space-y-2.5">
      {assets.length === 0 ? (
        <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border/40 p-3 text-center text-sm font-bold text-muted-foreground">
          <Layers3 size={18} className="mb-2 opacity-50" />
          {emptyLabel}
        </div>
      ) : (
        assets.map((asset) => (
          <li key={asset.id} className="list-none">
            <div className="group flex w-full flex-col gap-2.5 overflow-hidden rounded-xl border border-border/40 bg-card/50 p-3 text-left transition-all hover:border-primary/40 hover:bg-card/70">
              <button
                type="button"
                onClick={() => onAdd(asset)}
                className="flex cursor-pointer items-start gap-3 rounded-lg text-left transition-transform active:scale-[0.98]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-background/50 text-primary transition-colors group-hover:bg-primary/10">
                  {getIcon(asset.type)}
                </span>
                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="mb-1 block line-clamp-1 break-all text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {asset.name}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="h-5 border-primary/20 bg-primary/5 px-2 text-[10px] font-black uppercase tracking-widest text-primary/80"
                    >
                      {asset.type}
                    </Badge>
                    {asset.durationMs && (
                      <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground/60">
                        {formatDuration(asset.durationMs)}
                      </span>
                    )}
                  </span>
                </span>
              </button>

              <div className="flex items-center justify-between gap-2 border-t border-border/10 pt-2 opacity-60 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onAdd(asset)}
                  className="rounded text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 transition-colors hover:text-primary"
                >
                  Klik untuk tambah ke studio
                </button>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onRemove(asset.id)}
                    aria-label={`Hapus asset ${asset.name}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-white"
                    onClick={() => onAdd(asset)}
                    aria-label={`Tambah asset ${asset.name} ke studio`}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </li>
        ))
      )}
    </ul>
  );

  if (!scrollable) {
    return content;
  }

  return <ScrollArea className="flex-1 p-3">{content}</ScrollArea>;
}

function MediaFilterTab({
  count,
  icon,
  label,
  value,
}: Readonly<{ count: number; icon: ReactNode; label?: string; value: string }>) {
  return (
    <Tab
      value={value}
      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary"
    >
      {icon}
      {label}
      <span className="text-[10px] opacity-40">{count}</span>
    </Tab>
  );
}

function AssetTabContent({
  assets,
  onAdd,
  onRemove,
  value,
}: Readonly<AssetListProps & { value: string }>) {
  return (
    <TabsContent
      value={value}
      className="min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col"
    >
      <AssetList assets={assets} onRemove={onRemove} onAdd={onAdd} />
    </TabsContent>
  );
}
