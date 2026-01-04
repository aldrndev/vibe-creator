import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ReactionPreviewProps {
  mainVideoUrl: string;
  reactionVideoUrl: string;
  aspectRatio: string;
  pipScale: number;
  circular: boolean;
  onPositionChange: (x: number, y: number) => void;
}

const ASPECT_RATIOS: Record<string, number> = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
  "4:5": 4 / 5,
};

export function ReactionPreview({
  mainVideoUrl,
  reactionVideoUrl,
  aspectRatio,
  pipScale,
  circular,
  onPositionChange,
  layoutMode = "pip",
  sideBySideLayout = "horizontal",
  splitRatio = 0.5,
  smoothBorder,
  overlayMode,
}: ReactionPreviewProps & {
  layoutMode?: "pip" | "side-by-side";
  sideBySideLayout?: "horizontal" | "vertical";
  splitRatio?: number;
  smoothBorder?: boolean;
  overlayMode?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(16 / 9);

  useEffect(() => {
    setRatio(ASPECT_RATIOS[aspectRatio] || 16 / 9);
  }, [aspectRatio]);

  const handleDragEnd = () => {
    if (!containerRef.current || !pipRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const pip = pipRef.current.getBoundingClientRect();

    // Calculate relative position (0 to 1)
    // We use the top-left corner of the PIP relative to the container
    const relativeX = (pip.left - container.left) / container.width;
    const relativeY = (pip.top - container.top) / container.height;

    onPositionChange(relativeX, relativeY);
  };

  if (!mainVideoUrl || !reactionVideoUrl) return null;

  return (
    <div className="w-full flex justify-center bg-black/5 rounded-xl border border-divider p-4">
      <div
        ref={containerRef}
        className="relative bg-black overflow-hidden shadow-lg rounded-lg"
        style={{
          width: "100%",
          maxWidth: aspectRatio === "9:16" ? "360px" : "640px",
          aspectRatio: ratio,
        }}
      >
        {layoutMode === "pip" ? (
          <>
            <video
              src={mainVideoUrl}
              className="w-full h-full object-cover pointer-events-none"
              muted
            />

            <motion.div
              ref={pipRef}
              drag
              dragConstraints={containerRef}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              className={cn(
                "absolute z-10 cursor-move border-2 border-primary shadow-xl overflow-hidden group",
                circular ? "rounded-full" : "rounded-lg"
              )}
              style={{
                width: `${pipScale * 100}%`,
                aspectRatio: circular ? "1/1" : "auto",
                top: "10%",
                left: "60%",
              }}
              whileHover={{ scale: 1.02 }}
              whileDrag={{ scale: 1.05, cursor: "grabbing" }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none z-20">
                <GripVertical className="text-white drop-shadow-md" />
              </div>

              <video
                src={reactionVideoUrl}
                className={cn(
                  "w-full h-full object-cover pointer-events-none",
                  circular ? "scale-110" : ""
                )}
                muted
              />
            </motion.div>
          </>
        ) : (
          /* Side-by-Side Layout (Absolute Logic) */
          <div className="w-full h-full relative">
            {/* 
                Layer 1: Main Video 
                Backend Logic: If Overlay=True, Main Video is scaled to fill entire canvas (background).
                Otherwise, it occupies its Grid Slot (Left/Top).
             */}
            <div
              className="absolute overflow-hidden bg-zinc-900 border-black/10 transition-all duration-300 ease-in-out"
              style={{
                left: 0,
                top: 0,
                // If Overlay: Full Width/Height. If Not: Width/Height based on Split.
                width: overlayMode
                  ? "100%"
                  : sideBySideLayout === "horizontal"
                  ? `${splitRatio * 100}%`
                  : "100%",
                height: overlayMode
                  ? "100%"
                  : sideBySideLayout === "vertical"
                  ? `${splitRatio * 100}%`
                  : "100%",
                zIndex: 1, // Base Layer
              }}
            >
              <video
                src={mainVideoUrl}
                className="w-full h-full object-cover"
                muted
              />
              {!overlayMode && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur rounded text-[10px] text-white/80 font-medium">
                  Main
                </div>
              )}
            </div>

            {/* 
                Layer 2: Reaction Video 
                Always occupies its designated Grid Slot (Right/Bottom).
                Sits ON TOP of Main Video (z-index 2).
             */}
            <div
              className="absolute overflow-hidden bg-zinc-800 transition-all duration-300 ease-in-out"
              style={{
                // Position determined by Split Ratio
                left:
                  sideBySideLayout === "horizontal"
                    ? `${splitRatio * 100}%`
                    : 0,
                top:
                  sideBySideLayout === "vertical" ? `${splitRatio * 100}%` : 0,

                // Size determined by remaining space
                width:
                  sideBySideLayout === "horizontal"
                    ? `${(1 - splitRatio) * 100}%`
                    : "100%",
                height:
                  sideBySideLayout === "vertical"
                    ? `${(1 - splitRatio) * 100}%`
                    : "100%",

                zIndex: 2, // Top Layer

                // Gradient Mask Logic (Smooth Border)
                // Horizontal: Fade Left Edge. Vertical: Fade Top Edge.
                // We use maskImage to create transparency grad.
                maskImage: smoothBorder
                  ? sideBySideLayout === "horizontal"
                    ? "linear-gradient(to right, transparent 0%, black 15%)"
                    : "linear-gradient(to bottom, transparent 0%, black 15%)"
                  : undefined,
                WebkitMaskImage: smoothBorder
                  ? sideBySideLayout === "horizontal"
                    ? "linear-gradient(to right, transparent 0%, black 15%)"
                    : "linear-gradient(to bottom, transparent 0%, black 15%)"
                  : undefined,
              }}
            >
              <video
                src={reactionVideoUrl}
                className="w-full h-full object-cover"
                muted
              />
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur rounded text-[10px] text-white/80 font-medium">
                Reaction
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
