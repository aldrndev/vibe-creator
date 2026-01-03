import { Button, ScrollShadow } from '@heroui/react';
import { Film, Music, Image as ImageIcon, Trash2, Plus } from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { clsx } from 'clsx';

interface AssetPanelProps {
  className?: string;
}

export function AssetPanel({ className }: AssetPanelProps) {
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
    <div className={clsx("w-64 border-r border-divider flex flex-col bg-background/50 flex-shrink-0", className)}>
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
                className="group relative flex items-center gap-3 p-2 rounded-lg hover:bg-content2 transition-colors cursor-pointer border border-transparent hover:border-divider"
              >
                <div className="w-10 h-10 rounded bg-content3 flex items-center justify-center text-foreground/50 flex-shrink-0 overflow-hidden">
                  {asset.type === 'IMAGE' || (asset.type === 'VIDEO' &&  asset.url) ? (
                    // In a real app we would have thumbnails. For now just icon
                    getIcon(asset.type)
                  ) : (
                    getIcon(asset.type)
                  )}
                </div>
                
                <div className="flex-1 min-w-0" onClick={() => handleAddToTimeline(asset)}>
                  <p className="text-sm font-medium truncate">{asset.name}</p>
                  <p className="text-xs text-foreground/50">{formatDuration(asset.durationMs)}</p>
                </div>
                
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  className="opacity-0 group-hover:opacity-100"
                  onPress={() => removeAsset(asset.id)}
                >
                  <Trash2 size={14} />
                </Button>
                
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="absolute right-10 opacity-0 group-hover:opacity-100"
                  onPress={() => handleAddToTimeline(asset)}
                >
                  <Plus size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollShadow>
    </div>
  );
}
