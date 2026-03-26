import { Film, Image as ImageIcon, Music, Plus, Search, Trash2 } from 'lucide-react';
import { Badge, Card, CardBody, ScrollArea } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';

interface AssetPanelProps {
  readonly className?: string;
}

export function AssetPanel({ className }: Readonly<AssetPanelProps>) {
  const { assets, removeAsset, timeline, addClip } = useEditorStore();

  const getIcon = (type: 'VIDEO' | 'AUDIO' | 'IMAGE') => {
    switch (type) {
      case 'VIDEO':
        return <Film size={18} className="text-blue-400" />;
      case 'AUDIO':
        return <Music size={18} className="text-emerald-400" />;
      case 'IMAGE':
        return <ImageIcon size={18} className="text-amber-400" />;
    }
  };

  const handleAddToTimeline = (asset: (typeof assets)[0]) => {
    const trackType = asset.type === 'AUDIO' ? 'AUDIO' : 'VIDEO';
    const track = timeline.tracks.find((t) => t.type === trackType);

    if (!track) return;

    const lastClipEnd = track.clips.length > 0 ? Math.max(...track.clips.map((c) => c.endMs)) : 0;

    addClip(track.id, {
      assetId: asset.id,
      startMs: lastClipEnd,
      endMs: lastClipEnd + (asset.durationMs ?? 5000),
      trimStartMs: 0,
      trimEndMs: 0,
      transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      effects: { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 },
      asset,
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '00:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'w-full md:w-72 flex flex-col bg-background border-r border-border shrink-0 animate-in slide-in-from-left duration-500',
        className,
      )}
    >
      <div className="p-4 md:p-6 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Assets</h3>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {assets.length}
          </Badge>
        </div>

        <div className="relative group">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors"
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-muted/40 border-input border h-9 rounded-lg pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-2 md:grid-cols-1 gap-3">
          {assets.length === 0 ? (
            <div className="col-span-2 md:col-span-1 text-center py-12 px-6">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus size={20} className="text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground">No Assets</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Import media to start editing
              </p>
            </div>
          ) : (
            assets.map((asset) => (
              <Card
                key={asset.id}
                className="group relative bg-muted/20 border-border/40 hover:border-border hover:bg-muted/40 transition-all duration-200 overflow-hidden shadow-none"
              >
                <CardBody className="p-2">
                  <div className="flex items-start gap-3">
                    <div className="relative w-16 h-16 md:w-14 md:h-14 rounded-lg bg-muted flex items-center justify-center border border-border/50 overflow-hidden shrink-0 group/thumb">
                      {asset.type === 'IMAGE' && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-80"
                          style={{ backgroundImage: `url(${asset.url})` }}
                        />
                      )}
                      <div
                        className={cn(
                          'relative z-10 transition-opacity duration-200',
                          asset.type === 'IMAGE' &&
                            'drop-shadow-md text-white group-hover/thumb:opacity-0',
                        )}
                      >
                        {getIcon(asset.type)}
                      </div>

                      {/* Thumbnail Overlay Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                        <button
                          type="button"
                          className="h-6 w-6 rounded-full bg-white/90 text-black flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                          onClick={() => handleAddToTimeline(asset)}
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between h-full">
                      <div>
                        <p className="text-xs font-medium truncate text-foreground">{asset.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1 py-0 border-border/50 text-muted-foreground uppercase tracking-wider font-mono"
                          >
                            {asset.type}
                          </Badge>
                          {asset.durationMs && (
                            <span className="text-[9px] tabular-nums text-muted-foreground/80">
                              {formatDuration(asset.durationMs)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete button (only shows on row hover) */}
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity md:translate-y-1">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          onClick={() => removeAsset(asset.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
