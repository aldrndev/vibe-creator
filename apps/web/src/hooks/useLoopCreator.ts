import { useState, useRef, useEffect } from "react";
import { logger } from "@/lib/logger";
import { authFetch } from "@/services/api";

export type LoopMode = "loop" | "boomerang" | "gif";

export function useLoopCreator() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loopMode, setLoopMode] = useState<LoopMode>("loop");
  const [loopCount, setLoopCount] = useState(3);
  const [aspectRatio, setAspectRatio] = useState<string>("");
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(5000);
  const [maxDuration, setMaxDuration] = useState(30000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [useDurationMode, setUseDurationMode] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate loopCount based on targetMinutes and current video segment duration
  useEffect(() => {
    if (useDurationMode && videoRef.current) {
      const segmentDurationSeconds = (endMs - startMs) / 1000;
      if (segmentDurationSeconds > 0) {
        const targetDurationSeconds = targetMinutes * 60;
        let calculatedLoopCount = Math.ceil(
          targetDurationSeconds / segmentDurationSeconds
        );
        if (loopMode === "boomerang") {
          // Boomerang cycle is 2x segment duration (forward + backward)
          calculatedLoopCount = Math.ceil(
            targetDurationSeconds / (segmentDurationSeconds * 2)
          );
        }
        setLoopCount(Math.max(1, calculatedLoopCount));
      } else {
        setLoopCount(1);
      }
    }
  }, [useDurationMode, targetMinutes, startMs, endMs, loopMode]);

  // Reset states when switching modes to prevent invalid values per mode limits
  useEffect(() => {
    setLoopCount(loopMode === "boomerang" ? 1 : 3);
    if (loopMode === "boomerang") setUseDurationMode(false);
  }, [loopMode]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(results).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [results]);

  const handleFileSelect = (file: File) => {
    if (file) {
      // Gate: Max Size 200MB
      if (file.size > 200 * 1024 * 1024) {
        alert("File terlalu besar! Maksimal 200MB.");
        return;
      }
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResults({});
    }
  };

  const handleVideoLoaded = (durationSec: number) => {
    const duration = durationSec * 1000;
    // Gate: Max Duration 5 Minutes
    if (duration > 5 * 60 * 1000) {
      alert("Durasi video terlalu panjang! Maksimal 5 menit.");
      setVideoFile(null);
      setVideoUrl("");
      return;
    }
    setMaxDuration(duration);
    setEndMs(Math.min(duration, 10000));
  };

  const handleProcess = async () => {
    if (!videoFile) return;

    try {
      setIsProcessing(true);
      setProcessingStatus("Mengupload video...");

      const formData = new FormData();
      formData.append("video", videoFile);

      const uploadRes = await authFetch("/api/v1/upload/video", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const inputPath = uploadData.data.filepath;

      setProcessingStatus(
        `Membuat ${
          loopMode === "gif"
            ? "GIF"
            : loopMode === "boomerang"
            ? "boomerang"
            : "loop"
        }...`
      );

      const endpoint =
        loopMode === "gif"
          ? "/api/v1/loop/gif"
          : loopMode === "boomerang"
          ? "/api/v1/loop/boomerang"
          : "/api/v1/loop/create";

      const body: {
        inputPath: string;
        startMs: number;
        endMs: number;
        aspectRatio?: string;
        crossfade?: boolean;
        loopCount?: number;
        fps?: number;
        width?: number;
      } = { inputPath, startMs, endMs };

      if (aspectRatio) {
        body.aspectRatio = aspectRatio;
      }

      // Auto enable seamless for standard loops
      if (loopMode === "loop") {
        body.crossfade = true;
        // UI is "Total Plays", Backend expects "Repeats" (Total - 1)
        body.loopCount = Math.max(1, loopCount - 1);
      }
      // NEW: Enable loopCount for Boomerang (Ping-Pong Loop)
      if (loopMode === "boomerang") {
        // UI is "Total Plays of (Forward+Backward) Cycle"
        // Backend Loop filter repeats = loopCount - 1
        body.loopCount = Math.max(1, loopCount - 1);
      }
      if (loopMode === "gif") {
        body.fps = 15;
        body.width = 480;
      }

      const processRes = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!processRes.ok) throw new Error("Processing failed");
      const processData = await processRes.json();

      // Handle Windows/Unix paths for filename
      const outputPath = processData.data.outputPath || processData.data;
      const filename =
        typeof outputPath === "string" ? outputPath.split(/[/\\]/).pop() : "";

      if (!filename) throw new Error("Invalid output path");

      setProcessingStatus("Mendownload hasil...");
      const downloadRes = await authFetch(`/api/v1/loop/download/${filename}`);
      if (!downloadRes.ok) throw new Error("Gagal mengambil file hasil");

      const blob = await downloadRes.blob();
      const downloadUrl = URL.createObjectURL(blob);

      setResults((prev) => ({
        ...prev,
        [loopMode]: downloadUrl,
      }));
      setProcessingStatus("Selesai!");
    } catch (err) {
      logger.error("Processing failed", err);
      setProcessingStatus(
        "Gagal: " + (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    videoFile,
    videoUrl,
    videoRef,
    fileInputRef,
    loopMode,
    setLoopMode,
    loopCount,
    setLoopCount,
    aspectRatio,
    setAspectRatio,
    startMs,
    setStartMs,
    endMs,
    setEndMs,
    maxDuration,
    isProcessing,
    processingStatus,
    results,
    useDurationMode,
    setUseDurationMode,
    targetMinutes,
    setTargetMinutes,
    handleFileSelect,
    handleVideoLoaded,
    handleProcess,
  };
}
