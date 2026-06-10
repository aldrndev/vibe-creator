import { Download, Radio, Repeat2, Sparkles, Video, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import { getWorkspaceThumbnailPath, type WorkspaceItem } from '@/services/workspace-api';

interface WorkspaceHistoryThumbnailProps {
  readonly item: WorkspaceItem;
  readonly compact?: boolean;
  readonly disabled?: boolean;
}

interface ToolFallbackIconProps {
  readonly item: WorkspaceItem;
}

function ToolFallbackIcon({ item }: ToolFallbackIconProps) {
  if (item.kind === 'ai-director') return <Sparkles size={22} />;
  if (item.kind === 'video-studio') return <Wand2 size={22} />;
  if (item.kind === 'loop-creator') return <Repeat2 size={22} />;
  if (item.kind === 'reaction-video') return <Video size={22} />;
  if (item.kind === 'live-stream') return <Radio size={22} />;
  if (item.kind === 'export') return <Download size={22} />;
  return <Wand2 size={22} />;
}

/**
 * Displays a lazily fetched protected poster for a history item with a stable tool fallback.
 */
export function WorkspaceHistoryThumbnail({
  item,
  compact = false,
  disabled = false,
}: WorkspaceHistoryThumbnailProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) {
      return;
    }

    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled]);

  useEffect(() => {
    if (!shouldLoad || disabled) {
      setThumbnailUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    void authFetch(getWorkspaceThumbnailPath(item))
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) {
          setThumbnailUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [disabled, item, shouldLoad]);

  return (
    <div
      ref={elementRef}
      className={cn(
        'relative shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20',
        compact ? 'h-12 w-16' : 'h-28 w-20 sm:h-32 sm:w-24',
        disabled && 'opacity-55 grayscale',
      )}
    >
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" aria-hidden="true" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ToolFallbackIcon item={item} />
        </div>
      )}
    </div>
  );
}
