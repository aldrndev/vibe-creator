import { Button, ScrollShadow } from '@heroui/react';
import { Film, Music, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';

export function AssetPanel() {
  const { assets, removeAsset, timeline, addClip } = useEditorStore();
  
  const getIcon = (type: 'VIDEO' | 'AUDIO' | 'IMAGE') => {
    switch (type) {
      case 'VIDEO':
        return <Film size={16} />;
      case 'AUDIO':
        return <Music size={16} />;
      case 'IMAGE':
        return <ImageIcon size={16} />;
    }
  };
  
  const handleAddToTimeline = (asset: typeof assets[0]) => {
    const trackType = asset.type === 'AUDIO' ? 'AUDIO' : 'VIDEO';
    const track = timeline.tracks.find(t => t.type === trackType);
    
    if (!track) return;
    
    const lastClipEnd = track.clips.length > 0
      ? Math.max(...track.clips.map(c => c.endMs))
      : 0;
    
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
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="w-64 border-r border-divider flex flex-col bg-background/50 flex-shrink-0">
      <div className="p-3 border-b border-divider">
        <h3 className="font-medium text-sm">Media</h3>
      </div>
      
      <ScrollShadow className="flex-1 p-2">
        {assets.length === 0 ? (
          <div className="text-center text-foreground/40 text-sm py-8 px-4">
            <p>Belum ada media</p>
            <p className="mt-1 text-xs">Klik Import untuk menambah</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors cursor-pointer"
                onClick={() => handleAddToTimeline(asset)}
              >
                <div className="flex items-start gap-2">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded bg-foreground/10 flex items-center justify-center flex-shrink-0">
                    {asset.type === 'VIDEO' && asset.thumbnailUrl ? (
                      <img 
                        src={asset.thumbnailUrl} 
                        alt="" 
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      getIcon(asset.type)
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <p className="text-xs text-foreground/50">
                      {asset.type} • {formatDuration(asset.durationMs)}
                    </p>
                  </div>
                  
                  {/* Delete button */}
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onPress={() => {
                      removeAsset(asset.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollShadow>
    </div>
  );
}
