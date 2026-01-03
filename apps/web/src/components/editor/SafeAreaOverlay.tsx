import { clsx } from 'clsx';

interface SafeAreaGuide {
  id: string;
  name: string;
  /** Top safe area in percentage */
  top: number;
  /** Bottom safe area in percentage */
  bottom: number;
  /** Left safe area in percentage */
  left: number;
  /** Right safe area in percentage */
  right: number;
  /** Color of the guide lines */
  color: string;
}

/**
 * Safe area guides for different social platforms
 */
export const SAFE_AREA_GUIDES: SafeAreaGuide[] = [
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
    left: 5,
    right: 5,
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
    color: '#1da1f2',
  },
  {
    id: 'broadcast',
    name: 'Broadcast (Title Safe)',
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
    color: '#ffffff',
  },
];

interface SafeAreaOverlayProps {
  guideId: string;
  visible: boolean;
  className?: string;
}

/**
 * SafeAreaOverlay component
 * Renders safe area guides on the video preview
 */
export function SafeAreaOverlay({ guideId, visible, className }: SafeAreaOverlayProps) {
  if (!visible || guideId === 'none') return null;
  
  const guide = SAFE_AREA_GUIDES.find(g => g.id === guideId);
  if (!guide) return null;
  
  return (
    <div className={clsx('absolute inset-0 pointer-events-none', className)}>
      {/* Top danger zone */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: `${guide.top}%`,
          background: `linear-gradient(to bottom, ${guide.color}30, transparent)`,
        }}
      />
      
      {/* Bottom danger zone */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${guide.bottom}%`,
          background: `linear-gradient(to top, ${guide.color}30, transparent)`,
        }}
      />
      
      {/* Left danger zone */}
      <div
        className="absolute top-0 bottom-0 left-0"
        style={{
          width: `${guide.left}%`,
          background: `linear-gradient(to right, ${guide.color}30, transparent)`,
        }}
      />
      
      {/* Right danger zone */}
      <div
        className="absolute top-0 bottom-0 right-0"
        style={{
          width: `${guide.right}%`,
          background: `linear-gradient(to left, ${guide.color}30, transparent)`,
        }}
      />
      
      {/* Safe area border */}
      <div
        className="absolute border-2 border-dashed"
        style={{
          top: `${guide.top}%`,
          bottom: `${guide.bottom}%`,
          left: `${guide.left}%`,
          right: `${guide.right}%`,
          borderColor: guide.color,
        }}
      />
      
      {/* Platform label */}
      <div
        className="absolute text-[10px] font-medium px-1.5 py-0.5 rounded"
        style={{
          top: `${guide.top}%`,
          left: `${guide.left}%`,
          transform: 'translateY(-100%)',
          backgroundColor: guide.color,
          color: '#ffffff',
        }}
      >
        {guide.name} Safe Area
      </div>
    </div>
  );
}

/**
 * Get safe area guide by ID
 */
export function getSafeAreaGuide(id: string): SafeAreaGuide | undefined {
  return SAFE_AREA_GUIDES.find(g => g.id === id);
}

/**
 * Check if position is within safe area
 */
export function isWithinSafeArea(
  x: number,
  y: number,
  guideId: string
): boolean {
  const guide = getSafeAreaGuide(guideId);
  if (!guide || guideId === 'none') return true;
  
  return (
    x >= guide.left &&
    x <= (100 - guide.right) &&
    y >= guide.top &&
    y <= (100 - guide.bottom)
  );
}
