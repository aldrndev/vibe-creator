import { useState, useRef, useEffect } from "react";
import { logger } from "@/lib/logger";
import { authFetch } from "@/services/api";

export type StreamPlatform =
  | "youtube"
  | "tiktok"
  | "twitch"
  | "facebook"
  | "instagram"
  | "custom";

export function useLiveStream() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");

  const [platform, setPlatform] = useState<StreamPlatform>("youtube");
  const [streamKey, setStreamKey] = useState("");
  const [customRtmpUrl, setCustomRtmpUrl] = useState("");

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string>("");
  const [streamStatus, setStreamStatus] = useState<string>("");

  const [quality, setQuality] = useState<"720p" | "1080p">("720p");
  const [bitrate, setBitrate] = useState<number>(2500);
  const [duration, setDuration] = useState<number>(60);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [showTopup, setShowTopup] = useState(false);

  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUploadedFile = useRef<File | null>(null);
  const lastUploadedPath = useRef<string | null>(null);

  // Restore Session on Mount
  useEffect(() => {
    const checkActiveStream = async () => {
      try {
        const res = await authFetch("/api/v1/stream/active");
        if (res.ok) {
          const data = await res.json();
          const active = data.data.streams[0]; // Take first active
          if (active) {
            setStreamId(active.id);
            setPlatform(active.platform as StreamPlatform);
            setIsStreaming(true);
            setStreamStatus(active.status);

            // Start polling immediately
            pollStatus(active.id);
          }
        }
      } catch (e) {
        // Log error silently - don't show to user
        void e;
      }
    };

    // Fetch Quota
    const fetchQuota = async () => {
      try {
        const res = await authFetch("/api/v1/billing/quota");
        if (res.ok) {
          const data = await res.json();
          setQuotaRemaining(data.data.remaining);
        }
      } catch {
        // Quota fetch failed - ignore
      }
    };

    checkActiveStream();
    fetchQuota();

    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, []);

  const pollStatus = (id: string) => {
    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    statusIntervalRef.current = setInterval(async () => {
      try {
        const statusRes = await authFetch(`/api/v1/stream/${id}/status`);
        const statusData = await statusRes.json();

        if (
          statusData.data.status === "ENDED" ||
          statusData.data.status === "FAILED"
        ) {
          setIsStreaming(false);
          setStreamStatus(statusData.data.status);
          if (statusIntervalRef.current)
            clearInterval(statusIntervalRef.current);
        } else {
          setStreamStatus(statusData.data.status);
        }
      } catch {
        // Polling error - silently ignore and try again on next interval
      }
    }, 5000);
  };

  const handleFileSelect = (file: File) => {
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
  };

  const handleStartStream = async () => {
    if (!videoFile || !streamKey) return;

    try {
      setStreamStatus("Mengupload video...");

      let inputPath = "";

      // Check Cache
      if (videoFile === lastUploadedFile.current && lastUploadedPath.current) {
        logger.info("Using cached uploaded video path");
        inputPath = lastUploadedPath.current;
        setStreamStatus("Menggunakan video cache...");
      } else {
        const formData = new FormData();
        formData.append("video", videoFile);

        const uploadRes = await authFetch("/api/v1/upload/video", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Upload failed");
        const uploadData = await uploadRes.json();
        inputPath = uploadData.data.filepath;

        // Update Cache
        lastUploadedFile.current = videoFile;
        lastUploadedPath.current = inputPath;
      }

      setStreamStatus("Memulai streaming...");

      const streamRes = await authFetch("/api/v1/stream/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputPath,
          config: {
            platform,
            streamKey,
            rtmpUrl:
              platform === "custom" || showAdvanced ? customRtmpUrl : undefined,
            quality,
            bitrateKbps: bitrate,
            durationMinutes: duration,
          },
        }),
      });

      const streamData = await streamRes.json();

      if (!streamRes.ok) {
        throw new Error(streamData.error?.message || "Start stream failed");
      }

      setStreamId(streamData.data.streamId);
      setIsStreaming(true);
      setStreamStatus("LIVE");
      pollStatus(streamData.data.streamId); // Use shared poller
    } catch (err) {
      logger.error("Stream start failed", err);
      setStreamStatus(
        "Gagal: " + (err instanceof Error ? err.message : "Unknown error")
      );
      setIsStreaming(false);
    }
  };

  const handleStopStream = async () => {
    if (!streamId) return;

    try {
      setStreamStatus("Menghentikan stream...");

      await authFetch("/api/v1/stream/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId }),
      });

      setIsStreaming(false);
      setStreamStatus("Stream dihentikan");

      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    } catch (err) {
      logger.error("Stream stop failed", err);
      setStreamStatus(
        "Gagal menghentikan: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    }
  };

  return {
    // State
    videoFile,
    videoUrl,
    platform,
    setPlatform,
    streamKey,
    setStreamKey,
    customRtmpUrl,
    setCustomRtmpUrl,
    isStreaming,
    streamStatus,
    quality,
    setQuality,
    bitrate,
    setBitrate,
    duration,
    setDuration,
    showAdvanced,
    setShowAdvanced,
    quotaRemaining,
    showTopup,
    setShowTopup,

    // Actions
    handleFileSelect,
    handleStartStream,
    handleStopStream,
  };
}
