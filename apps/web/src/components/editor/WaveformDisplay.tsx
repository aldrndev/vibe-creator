import { useRef, useEffect, useMemo } from "react";
import { useWaveform, getCachedWaveform } from "@/hooks/use-waveform";
import { cn } from "@/lib/utils";

interface WaveformDisplayProps {
  audioUrl: string;
  assetId: string;
  width: number;
  height: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
  startMs?: number;
  endMs?: number;
  currentTimeMs?: number;
  showLoading?: boolean;
}

export function WaveformDisplay({
  audioUrl,
  assetId,
  width,
  height,
  color = "#10b981", // Emerald for audio
  backgroundColor = "transparent",
  className,
  startMs = 0,
  endMs,
  currentTimeMs,
  showLoading = true,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { waveform, duration, isLoading, error, generate } = useWaveform();

  useEffect(() => {
    const cached = getCachedWaveform(assetId);
    if (!cached && audioUrl) {
      generate(audioUrl, assetId);
    }
  }, [audioUrl, assetId, generate]);

  const timeRange = useMemo(() => {
    const end = endMs ?? duration * 1000;
    return { startMs, endMs: end };
  }, [startMs, endMs, duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform || waveform.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    const totalDurationMs = duration * 1000;
    const startRatio = timeRange.startMs / totalDurationMs;
    const endRatio = timeRange.endMs / totalDurationMs;

    const startSample = Math.floor(startRatio * waveform.length);
    const endSample = Math.ceil(endRatio * waveform.length);
    const visibleSamples = endSample - startSample;

    if (visibleSamples <= 0) return;

    const barWidth = width / visibleSamples;
    const centerY = height / 2;
    const maxBarHeight = height * 0.85;

    ctx.fillStyle = color;

    for (let i = 0; i < visibleSamples; i++) {
      const sampleIndex = startSample + i;
      const amplitude = Math.abs(waveform[sampleIndex] ?? 0);
      const barHeight = Math.max(amplitude * maxBarHeight, 2);
      const x = i * barWidth;
      const y = centerY - barHeight / 2;
      const gap = barWidth > 3 ? 1.5 : barWidth > 1 ? 0.5 : 0;

      // Premium rounded bars if enough width
      if (barWidth > 2) {
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - gap, barHeight, 2);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, Math.max(barWidth - gap, 0.5), barHeight);
      }
    }

    if (
      currentTimeMs !== undefined &&
      currentTimeMs >= timeRange.startMs &&
      currentTimeMs <= timeRange.endMs
    ) {
      const playheadRatio =
        (currentTimeMs - timeRange.startMs) /
        (timeRange.endMs - timeRange.startMs);
      const playheadX = playheadRatio * width;

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#f87171");
      gradient.addColorStop(1, "#ef4444");
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(239, 68, 68, 0.5)";
      ctx.fillRect(playheadX - 1, 0, 2, height);
    }
  }, [
    waveform,
    width,
    height,
    color,
    backgroundColor,
    timeRange,
    duration,
    currentTimeMs,
  ]);

  if (isLoading && showLoading) {
    const skeletonHeights = [10, 25, 18, 30, 22, 28, 15, 20];
    return (
      <div
        className={cn("flex items-center justify-center opacity-40", className)}
        style={{ width, height }}
      >
        <div className="animate-pulse flex items-center gap-1">
          {skeletonHeights.map((h, i) => (
            <div
              key={i}
              className="bg-emerald-400/40 rounded-full"
              style={{
                width: 3,
                height: h,
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-[10px] font-black uppercase text-destructive/60 tracking-widest",
          className
        )}
        style={{ width, height }}
      >
        Signal Lost
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
        display: "block",
      }}
    />
  );
}
