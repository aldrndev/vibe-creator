import type { DashboardTool } from '@vibe-creator/shared';
import { Download, Radio, Repeat, Sparkles, Video, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';

interface DashboardThumbnailProps {
  readonly thumbnailUrl: string | null;
  readonly tool: DashboardTool | 'export';
  readonly className?: string;
}

function getFallbackIcon(tool: DashboardThumbnailProps['tool']) {
  if (tool === 'ai-director') return <Sparkles size={18} />;
  if (tool === 'video-studio') return <Wand2 size={18} />;
  if (tool === 'loop-creator') return <Repeat size={18} />;
  if (tool === 'reaction-video') return <Video size={18} />;
  if (tool === 'live-stream') return <Radio size={18} />;
  if (tool === 'export') return <Download size={18} />;
  return <Wand2 size={18} />;
}

export function DashboardThumbnail({ thumbnailUrl, tool, className }: DashboardThumbnailProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbnailUrl) {
      setObjectUrl(null);
      return;
    }

    let active = true;
    let nextObjectUrl: string | null = null;

    void authFetch(thumbnailUrl)
      .then(async (response) => {
        if (!response.ok) {
          return;
        }

        nextObjectUrl = URL.createObjectURL(await response.blob());
        if (active) {
          setObjectUrl(nextObjectUrl);
        } else {
          URL.revokeObjectURL(nextObjectUrl);
          nextObjectUrl = null;
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [thumbnailUrl]);

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-lg border border-border/60 bg-black/40',
        className,
      )}
    >
      {objectUrl ? (
        <>
          <img
            src={objectUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover blur-md opacity-40"
            aria-hidden="true"
          />
          <img
            src={objectUrl}
            alt=""
            className="relative h-full w-full object-contain"
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          {getFallbackIcon(tool)}
        </div>
      )}
    </div>
  );
}
