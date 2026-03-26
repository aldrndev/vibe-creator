import { cn } from '@/lib/utils';

interface SafeAreaGuide {
  id: string;
  name: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  color: string;
}

const SAFE_AREA_GUIDES: SafeAreaGuide[] = [
  {
    id: 'none',
    name: 'None',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    color: 'transparent',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    top: 10,
    bottom: 15,
    left: 5,
    right: 5,
    color: '#ff0000',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    top: 15,
    bottom: 20,
    left: 8,
    right: 8,
    color: '#00f2ea',
  },
  {
    id: 'instagram-reels',
    name: 'Instagram Reels',
    top: 12,
    bottom: 18,
    left: 5,
    right: 5,
    color: '#e1306c',
  },
  {
    id: 'instagram-feed',
    name: 'Instagram Feed',
    top: 5,
    bottom: 5,
    left: 5,
    right: 5,
    color: '#c13584',
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    top: 5,
    bottom: 10,
    left: 5,
    right: 5,
    color: '#ffffff',
  },
  {
    id: 'broadcast',
    name: 'Broadcast (Title Safe)',
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
    color: '#fbbf24',
  },
];

interface SafeAreaOverlayProps {
  guideId: string;
  visible: boolean;
  className?: string;
}

export function SafeAreaOverlay({ guideId, visible, className }: SafeAreaOverlayProps) {
  if (!visible || guideId === 'none') return null;

  const guide = SAFE_AREA_GUIDES.find((g) => g.id === guideId);
  if (!guide) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none z-40 animate-in fade-in duration-500',
        className,
      )}
    >
      {/* Danger Zones Overlays */}
      <div
        className="absolute top-0 left-0 right-0 mix-blend-overlay"
        style={{
          height: `${guide.top}%`,
          background: `linear-gradient(to bottom, ${guide.color}40, transparent)`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 mix-blend-overlay"
        style={{
          height: `${guide.bottom}%`,
          background: `linear-gradient(to top, ${guide.color}40, transparent)`,
        }}
      />
      <div
        className="absolute top-0 bottom-0 left-0 mix-blend-overlay"
        style={{
          width: `${guide.left}%`,
          background: `linear-gradient(to right, ${guide.color}40, transparent)`,
        }}
      />
      <div
        className="absolute top-0 bottom-0 right-0 mix-blend-overlay"
        style={{
          width: `${guide.right}%`,
          background: `linear-gradient(to left, ${guide.color}40, transparent)`,
        }}
      />

      {/* Safe area boundary lines */}
      <div
        className="absolute border-2 border-dashed mix-blend-difference opacity-60 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{
          top: `${guide.top}%`,
          bottom: `${guide.bottom}%`,
          left: `${guide.left}%`,
          right: `${guide.right}%`,
          borderColor: guide.color,
        }}
      />

      {/* Crosshair Center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white mix-blend-difference" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white mix-blend-difference" />
      </div>

      {/* Navigation & Platform Label */}
      <div
        className="absolute flex items-center gap-2 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md border border-white/10"
        style={{
          top: `${guide.top}%`,
          left: `${guide.left}%`,
          transform: 'translateY(-120%)',
          backgroundColor: `${guide.color}CC`,
        }}
      >
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">
          {guide.name} SAFE_ZONE
        </span>
      </div>

      {/* Bottom info */}
      <div
        className="absolute px-2 py-0.5 text-[8px] font-black uppercase text-white/40 tracking-tighter mix-blend-difference"
        style={{ bottom: `${guide.bottom + 2}%`, right: `${guide.right + 2}%` }}
      >
        {guide.top}% T / {guide.bottom}% B
      </div>
    </div>
  );
}
