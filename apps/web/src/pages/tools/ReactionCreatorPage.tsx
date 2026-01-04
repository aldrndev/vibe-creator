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
import toast from "react-hot-toast";

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

  const mainInputRef = useRef<HTMLInputElement>(null);
  const reactionInputRef = useRef<HTMLInputElement>(null);

  const handleMainVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        alert("Ukuran file maksimal 200MB");
        return;
      }
      setMainVideoFile(file);
      setMainVideoUrl(URL.createObjectURL(file));
      setResults({});
    }
  };

  const handleReactionVideoSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        alert("Ukuran file maksimal 200MB");
        return;
      }
      setReactionVideoFile(file);
      setReactionVideoUrl(URL.createObjectURL(file));
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
          toast.success("Video berhasil diproses!");
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
          toast.success("Video berhasil diproses!");
        } else {
          throw new Error(data.error?.message || "Gagal memproses video");
        }
      }
      setProcessingStatus("Selesai!");
    } catch (err) {
      console.error("Processing failed", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setProcessingStatus("Gagal: " + message);
      toast.error(message);
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
    <PageTransition className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers size={24} className="text-primary" />
            Reaction Creator
          </h1>
          <p className="text-foreground/60 text-sm">
            Buat video reaction atau tempel dengan mudah
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: HERO PREVIEW (Span 8) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <Card className="flex-1 bg-black/5 border-divider overflow-hidden min-h-[500px] flex flex-col">
              <div className="relative flex-1 flex items-center justify-center bg-zinc-900/50 p-8">
                {/* Empty State / Upload Zone if videos missing */}
                {!mainVideoUrl || !reactionVideoUrl ? (
                  <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl items-stretch justify-center h-1/2">
                    {/* Main Upload */}
                    <div
                      onClick={() => mainInputRef.current?.click()}
                      className={`flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 cursor-pointer transition-all hover:scale-[1.02] group
                                ${
                                  mainVideoUrl
                                    ? "border-success/50 bg-success/10"
                                    : "border-zinc-700 hover:border-primary hover:bg-zinc-800/50"
                                }`}
                    >
                      {mainVideoUrl ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                            <Check size={32} className="text-success" />
                          </div>
                          <p className="font-semibold text-success">
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
                          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                            <Monitor
                              size={40}
                              className="text-zinc-400 group-hover:text-primary"
                            />
                          </div>
                          <p className="text-lg font-bold text-zinc-300">
                            Upload Main Video
                          </p>
                          <p className="text-sm text-zinc-500 mt-2 text-center">
                            Video utama yang akan direaksikan
                          </p>
                        </>
                      )}
                    </div>

                    {/* Reaction Upload */}
                    <div
                      onClick={() => reactionInputRef.current?.click()}
                      className={`flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 cursor-pointer transition-all hover:scale-[1.02] group
                                ${
                                  reactionVideoUrl
                                    ? "border-success/50 bg-success/10"
                                    : "border-zinc-700 hover:border-secondary hover:bg-zinc-800/50"
                                }`}
                    >
                      {reactionVideoUrl ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                            <Check size={32} className="text-success" />
                          </div>
                          <p className="font-semibold text-success">
                            Reaction Video Loaded
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
                          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                            <Smartphone
                              size={40}
                              className="text-zinc-400 group-hover:text-secondary"
                            />
                          </div>
                          <p className="text-lg font-bold text-zinc-300">
                            Upload Reaction
                          </p>
                          <p className="text-sm text-zinc-500 mt-2 text-center">
                            Video wajah / kamera depan
                          </p>
                        </>
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
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardBody className="p-0 overflow-hidden">
                {/* Mode Selector (Styled like Loop Tool) */}
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

                <div className="p-6 space-y-6">
                  {/* Visual Preferences Section */}
                  <Card
                    className="border border-divider shadow-none bg-default-50/50"
                    radius="sm"
                  >
                    <CardBody className="space-y-4 p-4">
                      <h3 className="text-xs font-bold uppercase text-foreground/50 flex items-center gap-2">
                        <Settings2 size={14} /> Preferensi Visual
                      </h3>

                      {/* Aspect Ratio - Common */}
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

                      {layoutMode === "pip" ? (
                        /* PIP Specifics */
                        <div className="space-y-4 animate-in fade-in">
                          <div>
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">
                                Mode Lingkaran
                              </label>
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
                              <label className="text-sm font-medium">
                                Ukuran (Scale)
                              </label>
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
                            *Tip: Geser kotak preview di kiri untuk posisi
                          </p>
                        </div>
                      ) : (
                        /* SxS Specifics */
                        <div className="space-y-4 animate-in fade-in">
                          <div>
                            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                              <Grid size={14} className="text-secondary" />
                              Arah Grid
                            </label>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={
                                  sideBySideLayout === "horizontal"
                                    ? "solid"
                                    : "flat"
                                }
                                color="secondary"
                                className="flex-1"
                                onPress={() =>
                                  setSideBySideLayout("horizontal")
                                }
                              >
                                <div className="flex flex-col items-center mt-2">
                                  <div className="flex gap-0.5">
                                    <div className="w-3 h-4 border-2 border-current rounded-sm"></div>
                                    <div className="w-3 h-4 border-2 border-current rounded-sm bg-current/20"></div>
                                  </div>
                                  <span className="text-[10px]">
                                    Horizontal
                                  </span>
                                </div>
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  sideBySideLayout === "vertical"
                                    ? "solid"
                                    : "flat"
                                }
                                color="secondary"
                                className="flex-1"
                                onPress={() => setSideBySideLayout("vertical")}
                              >
                                <div className="flex flex-col items-center mt-2">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="w-4 h-2 border-2 border-current rounded-sm"></div>
                                    <div className="w-4 h-2 border-2 border-current rounded-sm bg-current/20"></div>
                                  </div>
                                  <span className="text-[10px]">Vertical</span>
                                </div>
                              </Button>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-sm font-medium">
                                Split Ratio
                              </label>
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
                                  Membuat batas antar video menjadi halus
                                  (seamless) dengan gradasi.
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
                                  Menambahkan background blur di area kosong
                                  agar terlihat smooth.
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
                              Aktifkan keduanya untuk smooth faded border antar
                              video.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* Audio Mixer Section */}
                  <Card
                    className="border border-divider shadow-none bg-default-50/50"
                    radius="sm"
                  >
                    <CardBody className="space-y-4 p-4">
                      <h3 className="text-xs font-bold uppercase text-foreground/50 flex items-center gap-2">
                        <Volume2 size={14} /> Audio Mixer
                      </h3>

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
                    </CardBody>
                  </Card>

                  {/* Process Button */}
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
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Hidden Inputs */}
        <input
          ref={mainInputRef}
          type="file"
          accept="video/*"
          onChange={handleMainVideoSelect}
          className="hidden"
        />
        <input
          ref={reactionInputRef}
          type="file"
          accept="video/*"
          onChange={handleReactionVideoSelect}
          className="hidden"
        />
      </div>
    </PageTransition>
  );
}
