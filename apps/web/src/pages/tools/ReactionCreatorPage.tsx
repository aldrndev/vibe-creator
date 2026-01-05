import { useState, useRef, useEffect, type ChangeEvent } from "react";

import {
  Button,
  Card,
  CardBody,
  Slider,
  Divider,
  Select,
  SelectItem,
  Switch,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import {
  Download,
  Monitor,
  Smartphone,
  Grid,
  Layers,
  Check,
  Sparkles,
  Settings2,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import { authFetch } from "@/services/api";

import { PageTransition } from "@/components/ui/PageTransition";
import { ReactionPreview } from "@/components/tools/ReactionPreview";

const RESOLUTIONS: Record<string, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

type LayoutMode = "pip" | "side-by-side";
type PipPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type SideBySideLayout = "horizontal" | "vertical";

const layoutModes = [
  {
    id: "pip" as const,
    name: "Picture-in-Picture",
    description: "Video reaksi di sudut",
    icon: Layers,
    color: "primary",
  },
  {
    id: "side-by-side" as const,
    name: "Side by Side",
    description: "Dua video berdampingan",
    icon: Grid,
    color: "secondary",
  },
];

export function ReactionCreatorPage() {
  const [mainVideoFile, setMainVideoFile] = useState<File | null>(null);
  const [mainVideoUrl, setMainVideoUrl] = useState<string>("");
  const [reactionVideoFile, setReactionVideoFile] = useState<File | null>(null);
  const [reactionVideoUrl, setReactionVideoUrl] = useState<string>("");

  const [layoutMode, setLayoutMode] = useState<LayoutMode>("side-by-side");
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [smoothBorder, setSmoothBorder] = useState(false);
  const [overlayMode, setOverlayMode] = useState(false);
  const [pipPosition] = useState<PipPosition>("top-right");
  const [pipScale, setPipScale] = useState(0.3);
  const [_pipMargin, _setPipMargin] = useState(20);
  const [reactionVolume, setReactionVolume] = useState(0.8);
  const [mainVolume, setMainVolume] = useState(1.0);
  const [customPosition, setCustomPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [sideBySideLayout, setSideBySideLayout] =
    useState<SideBySideLayout>("horizontal");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [circular, setCircular] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [mainVideoError, setMainVideoError] = useState<string | null>(null);
  const [reactionVideoError, setReactionVideoError] = useState<string | null>(
    null
  );

  const mainInputRef = useRef<HTMLInputElement>(null);
  const reactionInputRef = useRef<HTMLInputElement>(null);

  const handleMainVideoSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    setMainVideoError(null);
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        setMainVideoError("Ukuran file maksimal 200MB");
        return;
      }

      // Check duration
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => resolve();
      });

      if (video.duration > 300) {
        setMainVideoError("Durasi video maksimal 5 menit");
        URL.revokeObjectURL(video.src);
        return;
      }

      setMainVideoFile(file);
      setMainVideoUrl(video.src);
      setResults({});
    }
  };

  const handleReactionVideoSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    setReactionVideoError(null);
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        setReactionVideoError("Ukuran file maksimal 200MB");
        return;
      }

      // Check duration
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => resolve();
      });

      if (video.duration > 300) {
        setReactionVideoError("Durasi video maksimal 5 menit");
        URL.revokeObjectURL(video.src);
        return;
      }

      setReactionVideoFile(file);
      setReactionVideoUrl(video.src);
      setResults({});
    }
  };

  const handleProcess = async () => {
    if (!mainVideoFile || !reactionVideoFile) return;

    try {
      setIsProcessing(true);
      setProcessingStatus("Mengupload video utama...");

      const mainFormData = new FormData();
      mainFormData.append("video", mainVideoFile);

      const mainUploadRes = await authFetch("/api/v1/upload/video", {
        method: "POST",
        body: mainFormData,
      });
      if (!mainUploadRes.ok) throw new Error("Main video upload failed");
      const mainData = await mainUploadRes.json();

      setProcessingStatus("Mengupload video reaksi...");
      const reactionFormData = new FormData();
      reactionFormData.append("video", reactionVideoFile);
      const reactionUploadRes = await authFetch("/api/v1/upload/video", {
        method: "POST",
        body: reactionFormData,
      });
      if (!reactionUploadRes.ok)
        throw new Error("Reaction video upload failed");
      const reactionData = await reactionUploadRes.json();

      setProcessingStatus("Memproses video...");

      if (layoutMode === "pip") {
        const payload = {
          mainVideoPath: mainData.data.filepath,
          reactionVideoPath: reactionData.data.filepath,
          layout: layoutMode,
          position: pipPosition,
          customPosition: customPosition, // Add custom position
          scale: pipScale,
          margin: 20,
          aspectRatio,
          splitRatio:
            (layoutMode as string) === "side-by-side" ? splitRatio : undefined,
          smoothBorder:
            (layoutMode as string) === "side-by-side"
              ? smoothBorder
              : undefined,
          overlayMode:
            (layoutMode as string) === "side-by-side" ? overlayMode : undefined,
          reactionVolume,
          mainVolume,
          circular,
        };

        const res = await authFetch("/api/v1/reaction/create-mixed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.data) {
          const filename = data.data.outputPath.split("/").pop();
          setProcessingStatus("Mendownload hasil...");
          const downloadRes = await authFetch(
            `/api/v1/reaction/download/${filename}`
          );
          if (!downloadRes.ok) throw new Error("Gagal mengambil video hasil");
          const blob = await downloadRes.blob();
          const url = URL.createObjectURL(blob);
          setResults((prev) => ({ ...prev, [layoutMode]: url }));
        } else {
          throw new Error(data.error?.message || "Gagal memproses video");
        }
      } else {
        // Side-by-Side
        const payload = {
          leftVideoPath: mainData.data.filepath, // Main is Left/Top
          rightVideoPath: reactionData.data.filepath, // Reaction is Right/Bottom
          layout: sideBySideLayout,
          aspectRatio,
          reactionVolume,
          mainVolume,
          splitRatio,
          smoothBorder,
          overlayMode,
        };

        const res = await authFetch("/api/v1/reaction/create-side-by-side", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.data) {
          const filename = data.data.outputPath.split("/").pop();
          setProcessingStatus("Mendownload hasil...");
          const downloadRes = await authFetch(
            `/api/v1/reaction/download/${filename}`
          );
          if (!downloadRes.ok) throw new Error("Gagal mengambil video hasil");
          const blob = await downloadRes.blob();
          const url = URL.createObjectURL(blob);
          setResults((prev) => ({ ...prev, [layoutMode]: url }));
        } else {
          throw new Error(data.error?.message || "Gagal memproses video");
        }
      }
      setProcessingStatus("Selesai!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setProcessingStatus("Gagal: " + message);
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup blob URL on unmount or change
  useEffect(() => {
    return () => {
      Object.values(results).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [results]);

  const resultUrl = results[layoutMode];

  return (
    <PageTransition className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Hidden Inputs */}
        <input
          type="file"
          accept="video/*"
          ref={mainInputRef}
          onChange={handleMainVideoSelect}
          className="hidden"
        />
        <input
          type="file"
          accept="video/*"
          ref={reactionInputRef}
          onChange={handleReactionVideoSelect}
          className="hidden"
        />

        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Layers size={24} className="text-primary" />
              Reaction Creator
            </h1>
            <p className="text-foreground/60 text-sm">
              Buat video reaction atau tempel dengan mudah
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* LEFT COLUMN: HERO PREVIEW (Span 8) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <Card className="flex-1 bg-black/5 border-divider overflow-hidden min-h-[350px] md:min-h-[500px] flex flex-col">
              <div className="relative flex-1 flex items-center justify-center md:items-start md:justify-start bg-zinc-900/50 p-4 md:p-8">
                {/* Empty State / Upload Zone if videos missing */}
                {!mainVideoUrl || !reactionVideoUrl ? (
                  <div className="flex flex-col md:flex-row gap-4 w-full max-w-3xl items-stretch justify-center h-full md:h-1/2">
                    {/* Main Upload */}
                    <div
                      onClick={() => mainInputRef.current?.click()}
                      className={`flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer transition-all hover:scale-[1.02] group active:scale-95
                                ${
                                  mainVideoUrl
                                    ? "border-success/50 bg-success/10"
                                    : "border-zinc-700 hover:border-primary hover:bg-zinc-800/50"
                                }`}
                    >
                      {mainVideoUrl ? (
                        <>
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-success/20 flex items-center justify-center mb-3 md:mb-4">
                            <Check
                              size={24}
                              className="text-success md:w-8 md:h-8"
                            />
                          </div>
                          <p className="font-semibold text-success text-sm md:text-base">
                            Main Video Loaded
                          </p>
                          <Button
                            size="sm"
                            variant="flat"
                            className="mt-2"
                            onPress={() => mainInputRef.current?.click()}
                          >
                            Ganti
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-primary/20 transition-colors">
                            <Monitor
                              size={32}
                              className="text-zinc-400 group-hover:text-primary md:w-10 md:h-10"
                            />
                          </div>
                          <p className="text-base md:text-lg font-bold text-zinc-300">
                            Upload Main
                          </p>
                          <p className="text-xs md:text-sm text-zinc-500 mt-1 text-center">
                            Video utama
                          </p>
                          <p className="text-xs text-zinc-600 mt-2">
                            Max: 200MB / 5 menit
                          </p>
                        </>
                      )}
                      {mainVideoError && (
                        <p className="text-xs text-danger mt-2 text-center">
                          {mainVideoError}
                        </p>
                      )}
                    </div>

                    {/* Reaction Upload */}
                    <div
                      onClick={() => reactionInputRef.current?.click()}
                      className={`flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer transition-all hover:scale-[1.02] group active:scale-95
                                ${
                                  reactionVideoUrl
                                    ? "border-success/50 bg-success/10"
                                    : "border-zinc-700 hover:border-secondary hover:bg-zinc-800/50"
                                }`}
                    >
                      {reactionVideoUrl ? (
                        <>
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-success/20 flex items-center justify-center mb-3 md:mb-4">
                            <Check
                              size={24}
                              className="text-success md:w-8 md:h-8"
                            />
                          </div>
                          <p className="font-semibold text-success text-sm md:text-base">
                            Reaction Loaded
                          </p>
                          <Button
                            size="sm"
                            variant="flat"
                            className="mt-2"
                            onPress={() => reactionInputRef.current?.click()}
                          >
                            Ganti
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-secondary/20 transition-colors">
                            <Smartphone
                              size={32}
                              className="text-zinc-400 group-hover:text-secondary md:w-10 md:h-10"
                            />
                          </div>
                          <p className="text-base md:text-lg font-bold text-zinc-300">
                            Upload Reaction
                          </p>
                          <p className="text-xs md:text-sm text-zinc-500 mt-1 text-center">
                            Video Reaction
                          </p>
                          <p className="text-xs text-zinc-600 mt-2">
                            Max: 200MB / 5 menit
                          </p>
                        </>
                      )}
                      {reactionVideoError && (
                        <p className="text-xs text-danger mt-2 text-center">
                          {reactionVideoError}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  // PREVIEW MODE
                  <div className="w-full h-full flex items-center justify-center">
                    {/* Interactive Preview Component */}
                    <ReactionPreview
                      mainVideoUrl={mainVideoUrl}
                      reactionVideoUrl={reactionVideoUrl}
                      aspectRatio={aspectRatio}
                      pipScale={pipScale}
                      circular={circular}
                      onPositionChange={(x, y) => {
                        const res = RESOLUTIONS[aspectRatio];
                        if (res) {
                          setCustomPosition({
                            x: Math.round(x * res.w),
                            y: Math.round(y * res.h),
                          });
                        }
                      }}
                      layoutMode={layoutMode}
                      sideBySideLayout={sideBySideLayout}
                      splitRatio={splitRatio}
                      smoothBorder={smoothBorder}
                      overlayMode={overlayMode}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Bar: File Controls */}
              {(mainVideoUrl || reactionVideoUrl) && (
                <div className="bg-content1 p-4 flex flex-col sm:flex-row justify-between items-center border-t border-divider gap-4">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="flat"
                      fullWidth
                      className="sm:w-auto"
                      startContent={<Monitor size={14} />}
                      onPress={() => mainInputRef.current?.click()}
                    >
                      Ganti Main
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      fullWidth
                      className="sm:w-auto"
                      startContent={<Smartphone size={14} />}
                      onPress={() => reactionInputRef.current?.click()}
                    >
                      Ganti React
                    </Button>
                  </div>
                  <div className="text-xs text-foreground/50 text-center sm:text-right w-full sm:w-auto">
                    {customPosition
                      ? `Posisi: ${customPosition.x}px, ${customPosition.y}px`
                      : "Drag preview untuk mengatur posisi"}
                  </div>
                </div>
              )}
            </Card>

            {/* Result Area (Moved below Preview) */}
            {resultUrl && (
              <Card className="border-2 border-success/30 bg-success/5 animate-in fade-in slide-in-from-bottom-4">
                <CardBody className="space-y-4">
                  <div className="flex flex-row items-center gap-4">
                    <div className="bg-success/20 p-3 rounded-full">
                      <Check className="text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-success-700">
                        Video Selesai!
                      </h3>
                      <p className="text-xs text-success-600/80">
                        Siap didownload.
                      </p>
                    </div>
                    <Button
                      as="a"
                      href={resultUrl}
                      download
                      color="success"
                      startContent={<Download size={16} />}
                    >
                      Download Video
                    </Button>
                  </div>

                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
                    <AlertTriangle
                      className="text-warning shrink-0 mt-0.5"
                      size={18}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-warning-700 dark:text-warning-500">
                        Video Tidak Disimpan Permanen
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 text-warning-800/80 dark:text-warning-300/80">
                        Hasil video ini hanya tersimpan di server selama{" "}
                        <b>60 menit</b>. Harap segera unduh video Anda sebelum
                        dihapus otomatis oleh sistem.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: CONTROLS (Span 4) */}
          <div className="lg:col-span-4 space-y-4 md:space-y-6">
            <Card>
              <CardBody className="p-0 overflow-hidden">
                {/* Mode Selector (Always Visible) */}
                <div className="p-4 bg-default-50/50 border-b border-divider">
                  <label className="text-xs font-semibold uppercase text-foreground/50 mb-3 block px-1">
                    Mode Layout
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {layoutModes.map((mode) => (
                      <Card
                        key={mode.id}
                        isPressable
                        onPress={() => setLayoutMode(mode.id)}
                        className={`border-2 transition-all ${
                          layoutMode === mode.id
                            ? `border-${mode.color} bg-${mode.color}/5`
                            : "border-transparent hover:border-default-200"
                        }`}
                        shadow="sm"
                      >
                        <CardBody className="p-3 text-center flex flex-col items-center justify-center gap-2 h-full">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              layoutMode === mode.id
                                ? `bg-${mode.color}/20 text-${mode.color}`
                                : "bg-default-100 text-default-500"
                            }`}
                          >
                            <mode.icon size={18} />
                          </div>
                          <div>
                            <p
                              className={`font-semibold text-sm ${
                                layoutMode === mode.id
                                  ? `text-${mode.color}`
                                  : ""
                              }`}
                            >
                              {mode.name}
                            </p>
                            <p className="text-[10px] text-foreground/50 leading-tight mt-0.5">
                              {mode.description}
                            </p>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Desktop: Standard Vertical Flow / Mobile: Accordion */}
                <div className="p-0 md:p-6 md:space-y-6">
                  {/* Accordion Wrapper for Mobile Layout Optimization */}
                  <Accordion
                    defaultExpandedKeys={["visual", "audio"]}
                    selectionMode="multiple"
                    className="md:hidden px-2"
                  >
                    <AccordionItem
                      key="visual"
                      aria-label="Visual Preferences"
                      title={
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Settings2 size={16} /> Preferensi Visual
                        </div>
                      }
                    >
                      <div className="space-y-6 pb-2">
                        {/* Aspect Ratio */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium">
                              Aspect Ratio Output
                            </label>
                          </div>
                          <Select
                            selectedKeys={[aspectRatio]}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                              setAspectRatio(e.target.value)
                            }
                            size="sm"
                            aria-label="Aspect Ratio"
                          >
                            <SelectItem key="16:9">
                              16:9 (YouTube, FB Video)
                            </SelectItem>
                            <SelectItem key="9:16">
                              9:16 (TikTok/Reels/Shorts)
                            </SelectItem>
                            <SelectItem key="1:1">1:1 (IG/FB Feed)</SelectItem>
                            <SelectItem key="4:5">
                              4:5 (IG/FB Portrait)
                            </SelectItem>
                          </Select>
                        </div>
                        <Divider />
                        {/* Dynamic Controls based on Layout */}
                        <DynamicControls
                          layoutMode={layoutMode}
                          circular={circular}
                          setCircular={setCircular}
                          pipScale={pipScale}
                          setPipScale={setPipScale}
                          sideBySideLayout={sideBySideLayout}
                          setSideBySideLayout={setSideBySideLayout}
                          splitRatio={splitRatio}
                          setSplitRatio={setSplitRatio}
                          smoothBorder={smoothBorder}
                          setSmoothBorder={setSmoothBorder}
                          overlayMode={overlayMode}
                          setOverlayMode={setOverlayMode}
                        />
                      </div>
                    </AccordionItem>
                    <AccordionItem
                      key="audio"
                      aria-label="Audio Mixer"
                      title={
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Volume2 size={16} /> Audio Mixer
                        </div>
                      }
                    >
                      <div className="space-y-4 pb-4">
                        <AudioControls
                          mainVolume={mainVolume}
                          setMainVolume={setMainVolume}
                          reactionVolume={reactionVolume}
                          setReactionVolume={setReactionVolume}
                        />
                      </div>
                    </AccordionItem>
                  </Accordion>

                  {/* Desktop Only: Unwrapped */}
                  <div className="hidden md:block space-y-6">
                    <Card
                      className="border border-divider shadow-none bg-default-50/50"
                      radius="sm"
                    >
                      <CardBody className="space-y-4 p-4">
                        <h3 className="text-xs font-bold uppercase text-foreground/50 flex items-center gap-2">
                          <Settings2 size={14} /> Preferensi Visual
                        </h3>
                        {/* Aspect Ratio */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium">
                              Aspect Ratio Output
                            </label>
                          </div>
                          <Select
                            selectedKeys={[aspectRatio]}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                              setAspectRatio(e.target.value)
                            }
                            size="sm"
                            aria-label="Aspect Ratio"
                          >
                            <SelectItem key="16:9">
                              16:9 (YouTube, FB Video)
                            </SelectItem>
                            <SelectItem key="9:16">
                              9:16 (TikTok/Reels/Shorts)
                            </SelectItem>
                            <SelectItem key="1:1">1:1 (IG/FB Feed)</SelectItem>
                            <SelectItem key="4:5">
                              4:5 (IG/FB Portrait)
                            </SelectItem>
                          </Select>
                        </div>
                        <Divider className="my-2" />
                        <DynamicControls
                          layoutMode={layoutMode}
                          circular={circular}
                          setCircular={setCircular}
                          pipScale={pipScale}
                          setPipScale={setPipScale}
                          sideBySideLayout={sideBySideLayout}
                          setSideBySideLayout={setSideBySideLayout}
                          splitRatio={splitRatio}
                          setSplitRatio={setSplitRatio}
                          smoothBorder={smoothBorder}
                          setSmoothBorder={setSmoothBorder}
                          overlayMode={overlayMode}
                          setOverlayMode={setOverlayMode}
                        />
                      </CardBody>
                    </Card>

                    <Card
                      className="border border-divider shadow-none bg-default-50/50"
                      radius="sm"
                    >
                      <CardBody className="space-y-4 p-4">
                        <h3 className="text-xs font-bold uppercase text-foreground/50 flex items-center gap-2">
                          <Volume2 size={14} /> Audio Mixer
                        </h3>
                        <AudioControls
                          mainVolume={mainVolume}
                          setMainVolume={setMainVolume}
                          reactionVolume={reactionVolume}
                          setReactionVolume={setReactionVolume}
                        />
                      </CardBody>
                    </Card>
                  </div>

                  {/* Process Button - Sticky on Mobile */}
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-divider md:static md:bg-transparent md:border-none md:p-0 z-50">
                    <Button
                      size="lg"
                      color="primary"
                      className="w-full font-semibold shadow-lg shadow-primary/20"
                      startContent={!isProcessing && <Sparkles size={20} />}
                      isLoading={isProcessing}
                      isDisabled={!mainVideoFile || !reactionVideoFile}
                      onPress={handleProcess}
                    >
                      {isProcessing ? processingStatus : "Buat Video Reaction"}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

// Extracted for reuse between Mobile/Desktop views to avoid code duplication in render
function DynamicControls({
  layoutMode,
  circular,
  setCircular,
  pipScale,
  setPipScale,
  sideBySideLayout,
  setSideBySideLayout,
  splitRatio,
  setSplitRatio,
  smoothBorder,
  setSmoothBorder,
  overlayMode,
  setOverlayMode,
}: any) {
  if (layoutMode === "pip") {
    return (
      <div className="space-y-4 animate-in fade-in">
        <div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Mode Lingkaran</label>
            <Switch
              size="sm"
              isSelected={circular}
              onValueChange={setCircular}
              aria-label="Circular Mode"
            />
          </div>
          <p className="text-[10px] text-foreground/50">
            Ubah bentuk video reaction menjadi lingkaran.
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium">Ukuran (Scale)</label>
            <span className="text-xs font-mono bg-default-200 px-2 py-0.5 rounded text-foreground/70">
              {Math.round(pipScale * 100)}%
            </span>
          </div>
          <Slider
            size="sm"
            step={0.01}
            minValue={0.15}
            maxValue={0.5}
            value={pipScale}
            onChange={(v) => setPipScale(v as number)}
            className="max-w-md"
            aria-label="PIP Scale"
          />
        </div>
        <p className="text-xs text-foreground/50 mt-1 italic">
          *Tip: Ubah posisi video reaction dengan menggeser kotak preview di
          kiri.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in">
      <div>
        <label className="text-sm font-medium mb-3 block flex items-center gap-2">
          <Grid size={14} className="text-secondary" />
          Arah Grid
        </label>
        <div className="flex gap-2">
          <Button
            size="md"
            variant={sideBySideLayout === "horizontal" ? "solid" : "flat"}
            color="secondary"
            className="flex-1"
            onPress={() => setSideBySideLayout("horizontal")}
          >
            <div className="flex flex-col">
              <p>Horizontal</p>
              <p className="text-xs">Kanan-Kiri</p>
            </div>
          </Button>
          <Button
            size="md"
            variant={sideBySideLayout === "vertical" ? "solid" : "flat"}
            color="secondary"
            className="flex-1"
            onPress={() => setSideBySideLayout("vertical")}
          >
            <div className="flex flex-col">
              <p>Vertical</p>
              <p className="text-xs">Atas-Bawah</p>
            </div>
          </Button>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium">Split Ratio</label>
          <span className="text-xs font-mono bg-default-200 px-2 py-0.5 rounded text-foreground/70">
            {Math.round(splitRatio * 100)}% /{" "}
            {Math.round((1 - splitRatio) * 100)}%
          </span>
        </div>
        <Slider
          size="sm"
          step={0.05}
          minValue={0.5}
          maxValue={0.7}
          value={splitRatio}
          onChange={(v) => setSplitRatio(v as number)}
          aria-label="Split Ratio"
        />
        <p className="text-[10px] text-foreground/40 mt-1">
          Default ratio 50/50, geser kekanan untuk merubah.
        </p>
      </div>

      <div className="space-y-3 pt-2 bg-default-100/50 p-2 rounded-lg">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium block">
              Gradient Blending
            </label>
            <p className="text-[10px] text-foreground/50 leading-tight">
              Membuat batas antar video menjadi halus (seamless) dengan gradasi.
            </p>
          </div>
          <Switch
            size="sm"
            isSelected={smoothBorder}
            onValueChange={setSmoothBorder}
            aria-label="Smooth Border"
          />
        </div>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium block">
              Overlay Background
            </label>
            <p className="text-[10px] text-foreground/50 leading-tight">
              Menambahkan background blur di area kosong agar terlihat smooth.
            </p>
          </div>
          <Switch
            size="sm"
            isSelected={overlayMode}
            onValueChange={setOverlayMode}
            aria-label="Overlay Mode"
          />
        </div>
        <p className="text-[10px] text-foreground/50">
          Aktifkan keduanya untuk smooth faded border antar video utama dan
          reaction.
        </p>
      </div>
    </div>
  );
}

function AudioControls({
  mainVolume,
  setMainVolume,
  reactionVolume,
  setReactionVolume,
}: any) {
  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-semibold text-foreground/70">
            Main Audio
          </label>
          <span className="text-[10px] font-mono bg-success/10 text-success px-1.5 py-0.5 rounded">
            {Math.round(mainVolume * 100)}%
          </span>
        </div>
        <Slider
          size="sm"
          color="success"
          step={0.1}
          minValue={0}
          maxValue={2}
          value={mainVolume}
          onChange={(v) => setMainVolume(v as number)}
          aria-label="Main Volume"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-semibold text-foreground/70">
            Reaction Audio
          </label>
          <span className="text-[10px] font-mono bg-secondary/10 text-secondary px-1.5 py-0.5 rounded">
            {Math.round(reactionVolume * 100)}%
          </span>
        </div>
        <Slider
          size="sm"
          color="secondary"
          step={0.1}
          minValue={0}
          maxValue={2}
          value={reactionVolume}
          onChange={(v) => setReactionVolume(v as number)}
          aria-label="Reaction Volume"
        />
      </div>
    </>
  );
}
