import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ReactionPreviewProps {
  mainVideoUrl: string;
  reactionVideoUrl: string;
  aspectRatio: string;
  pipScale: number;
  circular: boolean;
  onPositionChange: (x: number, y: number) => void;
  layoutMode?: 'pip' | 'side-by-side';
  sideBySideLayout?: 'horizontal' | 'vertical';
  splitRatio?: number;
  smoothBorder?: boolean;
  overlayMode?: boolean;
}

const ASPECT_RATIOS: Record<string, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
};

function getPreviewMaxWidth(aspectRatio: string): string {
  return aspectRatio === '9:16' ? '360px' : '640px';
}

function getMainPaneStyle(
  overlayMode: boolean,
  sideBySideLayout: 'horizontal' | 'vertical',
  splitRatio: number,
): React.CSSProperties {
  let width = '100%';
  if (!overlayMode && sideBySideLayout === 'horizontal') {
    width = `${splitRatio * 100}%`;
  }

  let height = '100%';
  if (!overlayMode && sideBySideLayout === 'vertical') {
    height = `${splitRatio * 100}%`;
  }

  return {
    left: 0,
    top: 0,
    width,
    height,
    zIndex: 1,
  };
}

function getReactionPaneStyle(
  sideBySideLayout: 'horizontal' | 'vertical',
  splitRatio: number,
  smoothBorder: boolean,
): React.CSSProperties {
  let maskImage: string | undefined;
  if (smoothBorder) {
    maskImage =
      sideBySideLayout === 'horizontal'
        ? 'linear-gradient(to right, transparent 0%, black 25%)'
        : 'linear-gradient(to bottom, transparent 0%, black 25%)';
  }

  return {
    left: sideBySideLayout === 'horizontal' ? `${splitRatio * 100}%` : 0,
    top: sideBySideLayout === 'vertical' ? `${splitRatio * 100}%` : 0,
    width: sideBySideLayout === 'horizontal' ? `${(1 - splitRatio) * 100}%` : '100%',
    height: sideBySideLayout === 'vertical' ? `${(1 - splitRatio) * 100}%` : '100%',
    zIndex: 2,
    maskImage,
    WebkitMaskImage: maskImage,
  };
}

export function ReactionPreview({
  mainVideoUrl,
  reactionVideoUrl,
  aspectRatio,
  pipScale,
  circular,
  onPositionChange,
  layoutMode = 'pip',
  sideBySideLayout = 'horizontal',
  splitRatio = 0.5,
  smoothBorder = false,
  overlayMode = false,
}: Readonly<ReactionPreviewProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const ratio = useMemo(() => ASPECT_RATIOS[aspectRatio] || 16 / 9, [aspectRatio]);

  const handleDragEnd = () => {
    if (!containerRef.current || !pipRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const pip = pipRef.current.getBoundingClientRect();

    const relativeX = (pip.left - container.left) / container.width;
    const relativeY = (pip.top - container.top) / container.height;

    onPositionChange(relativeX, relativeY);
  };

  if (!mainVideoUrl || !reactionVideoUrl) return null;

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="relative bg-black rounded-4xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5"
        style={{
          width: '100%',
          maxWidth: getPreviewMaxWidth(aspectRatio),
          aspectRatio: ratio,
        }}
      >
        {layoutMode === 'pip' ? (
          <>
            <video
              src={mainVideoUrl}
              className="w-full h-full object-cover pointer-events-none"
              muted
            >
              <track kind="captions" label="Main video preview" />
            </video>

            <motion.div
              ref={pipRef}
              drag
              dragConstraints={containerRef}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              className={cn(
                'absolute z-10 cursor-move border-[3px] border-primary shadow-2xl overflow-hidden group',
                circular ? 'rounded-full' : 'rounded-2xl',
              )}
              style={{
                width: `${pipScale * 100}%`,
                aspectRatio: circular ? '1/1' : 'auto',
                top: '10%',
                left: '60%',
              }}
              whileHover={{ scale: 1.02 }}
              whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none z-20">
                <GripVertical className="text-white scale-125 transition-transform group-hover:rotate-12" />
              </div>

              <video
                src={reactionVideoUrl}
                className={cn(
                  'w-full h-full object-cover pointer-events-none',
                  circular ? 'scale-110' : '',
                )}
                muted
              >
                <track kind="captions" label="Reaction video preview" />
              </video>
            </motion.div>
          </>
        ) : (
          <div className="w-full h-full relative">
            <div
              className="absolute overflow-hidden bg-zinc-900 transition-all duration-500 ease-in-out"
              style={getMainPaneStyle(overlayMode, sideBySideLayout, splitRatio)}
            >
              <video src={mainVideoUrl} className="w-full h-full object-cover" muted>
                <track kind="captions" label="Main video preview" />
              </video>
              {!overlayMode && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[9px] text-white font-black uppercase tracking-widest">
                  Main
                </div>
              )}
            </div>

            <div
              className="absolute overflow-hidden bg-zinc-800 transition-all duration-500 ease-in-out"
              style={getReactionPaneStyle(sideBySideLayout, splitRatio, smoothBorder)}
            >
              <video src={reactionVideoUrl} className="w-full h-full object-cover" muted>
                <track kind="captions" label="Reaction video preview" />
              </video>
              <div className="absolute top-4 left-4 px-3 py-1 bg-primary/80 backdrop-blur-md rounded-full border border-white/20 text-[9px] text-white font-black uppercase tracking-widest">
                Reaction
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
