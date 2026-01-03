import { useEffect, useRef, useMemo } from 'react';
import { useWaveform, getCachedWaveform } from '@/hooks/use-waveform';
import { clsx } from 'clsx';

interface WaveformDisplayProps {
  audioUrl: string;
  assetId: string;
  width: number;
  height: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
  /** Time range in ms to display */
  startMs?: number;
  endMs?: number;
  /** Current playhead position in ms */
  currentTimeMs?: number;
  /** Show loading indicator */
  showLoading?: boolean;
}

/**
 * Waveform visualization component
 * Renders audio waveform on a canvas element
 */
export function WaveformDisplay({
  audioUrl,
  assetId,
  width,
  height,
  color = '#6366f1', // Primary color
  backgroundColor = 'transparent',
  className,
  startMs = 0,
  endMs,
  currentTimeMs,
  showLoading = true,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { waveform, duration, isLoading, error, generate } = useWaveform();

  // Generate waveform on mount or URL change
  useEffect(() => {
    // Check cache first
    const cached = getCachedWaveform(assetId);
    if (!cached && audioUrl) {
      generate(audioUrl, assetId);
    }
  }, [audioUrl, assetId, generate]);

  // Calculate time range
  const timeRange = useMemo(() => {
    const end = endMs ?? (duration * 1000);
    return { startMs, endMs: end };
  }, [startMs, endMs, duration]);

  // Render waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform || waveform.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Calculate which samples to display
    const totalDurationMs = duration * 1000;
    const startRatio = timeRange.startMs / totalDurationMs;
    const endRatio = timeRange.endMs / totalDurationMs;
    
    const startSample = Math.floor(startRatio * waveform.length);
    const endSample = Math.ceil(endRatio * waveform.length);
    const visibleSamples = endSample - startSample;
    
    if (visibleSamples <= 0) return;

    const barWidth = width / visibleSamples;
    const centerY = height / 2;
    const maxBarHeight = height * 0.8;

    // Draw waveform bars
    ctx.fillStyle = color;
    
    for (let i = 0; i < visibleSamples; i++) {
      const sampleIndex = startSample + i;
      const amplitude = waveform[sampleIndex] ?? 0;
      
      const barHeight = amplitude * maxBarHeight;
      const x = i * barWidth;
      const y = centerY - barHeight / 2;
      
      // Draw bar with slight gap
      const gap = barWidth > 2 ? 1 : 0;
      ctx.fillRect(x, y, Math.max(barWidth - gap, 0.5), barHeight || 1);
    }

    // Draw playhead if current time is provided
    if (currentTimeMs !== undefined && currentTimeMs >= timeRange.startMs && currentTimeMs <= timeRange.endMs) {
      const playheadRatio = (currentTimeMs - timeRange.startMs) / (timeRange.endMs - timeRange.startMs);
      const playheadX = playheadRatio * width;
      
      ctx.fillStyle = '#ef4444'; // Red playhead
      ctx.fillRect(playheadX - 1, 0, 2, height);
    }

  }, [waveform, width, height, color, backgroundColor, timeRange, duration, currentTimeMs]);

  // Loading state
  if (isLoading && showLoading) {
    const skeletonHeights = [12, 20, 16, 24, 14, 22, 18, 20]; // Static heights for skeleton bars
    
    return (
      <div 
        className={clsx('flex items-center justify-center', className)}
        style={{ width, height }}
      >
        <div className="animate-pulse flex items-center gap-1">
          {skeletonHeights.map((h, i) => (
            <div
              key={i}
              className="bg-foreground/20 rounded-full"
              style={{
                width: 2,
                height: h,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className={clsx('flex items-center justify-center text-xs text-danger', className)}
        style={{ width, height }}
      >
        Failed to load waveform
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ 
        width, 
        height,
        display: 'block',
      }}
    />
  );
}
