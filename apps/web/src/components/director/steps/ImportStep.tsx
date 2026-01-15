import { useRef, useState } from "react";
import { useDirectorStore } from "@/stores/director-store";
import { authFetch } from "@/services/api";
import { Card, CardBody, Input, Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Wand2,
  FileVideo,
  Link as LinkIcon,
  AlertCircle,
  Plus,
} from "lucide-react";
import { SupportedSourcesModal } from "./SupportedSourcesModal";

export const ImportStep = () => {
  const {
    activeSession,
    importUrl,
    setImportUrl,
    isLoading,
    error,
    isWaitingForAsset,
    downloadProgress,
    setSession,
    setStep,
    setLoading,
    setError,
    setWaitingForAsset,
  } = useDirectorStore();

  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch("/api/v1/director/sessions", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      if (data.success) {
        setSession(data.data);
        return data.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
    return null;
  };

  const startAnalysis = async (sessionId: string) => {
    try {
      const res = await authFetch(
        `/api/v1/director/sessions/${sessionId}/analyze`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        setStep("ANALYZING");
      } else {
        throw new Error(data.error?.message || "Analysis start failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setLoading(false);
    }
  };

  const handleUrlImport = async () => {
    let session = activeSession;
    if (!session) {
      session = await handleCreateSession();
    }
    if (!session || !importUrl) return;

    try {
      setLoading(true);
      const res = await authFetch(
        `/api/v1/director/sessions/${session.id}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "url", url: importUrl }),
        }
      );
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error?.message || "Import failed");

      const newAsset = { ...data.data, ingestStatus: "UPLOADING" };
      setSession({
        ...session,
        asset: newAsset,
      });

      if (data.data.ingestStatus === "READY") {
        await startAnalysis(session.id);
      } else {
        setWaitingForAsset(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let session = activeSession;
    if (!session) {
      session = await handleCreateSession();
    }
    if (!session) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await authFetch("/api/v1/upload/video", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success)
        throw new Error(uploadData.error?.message || "Upload failed");

      const importRes = await authFetch(
        `/api/v1/director/sessions/${session.id}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "file",
            filePath: uploadData.data.filepath,
          }),
        }
      );

      const importData = await importRes.json();
      if (!importData.success)
        throw new Error(importData.error?.message || "Import failed");

      setSession({
        ...session,
        asset: { ...importData.data, ingestStatus: "READY" },
      });
      await startAnalysis(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-card/70 border-border/50 backdrop-blur-xl relative overflow-hidden group mb-10">
        <CardBody className="p-6 sm:p-10 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center mb-2">
            <Wand2 className="w-6 h-6 text-white drop-shadow-sm" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-primary via-orange-500 to-rose-600">
              AI Director
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed font-medium">
              Ubah video panjang kamu menjadi Shorts yang viral dalam hitungan
              menit. 🚀
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-3 rounded-2xl text-sm border border-rose-500/20 w-full animate-in fade-in zoom-in-95 duration-300">
              <AlertCircle size={18} className="shrink-0" />
              <span className="font-semibold text-left">{error}</span>
            </div>
          )}

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* Upload Zone */}
            <div
              onClick={() =>
                !isWaitingForAsset && fileInputRef.current?.click()
              }
              className={cn(
                "group/upload relative min-h-[16rem] rounded-3xl border-2 border-dashed border-border/40 transition-all flex flex-col items-center justify-center gap-4 bg-muted/5 overflow-hidden",
                isWaitingForAsset
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-primary/60 hover:bg-primary/5 cursor-pointer active:scale-[0.98]"
              )}
            >
              <div className="w-14 h-14 rounded-2xl bg-muted/50 group-hover/upload:bg-primary/20 flex items-center justify-center transition-all duration-300 group-hover/upload:scale-110">
                <FileVideo className="w-7 h-7 text-muted-foreground group-hover/upload:text-primary transition-colors" />
              </div>
              <div className="text-center px-4">
                <p className="font-bold text-foreground group-hover/upload:text-primary transition-colors">
                  Upload File Video
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium bg-muted/30 px-3 py-1 rounded-full inline-block">
                  MP4, MOV • Maks 200MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isWaitingForAsset}
              />
            </div>

            {/* URL Zone */}
            <div className="min-h-[16rem] rounded-3xl border border-border/50 bg-muted/5 p-8 flex flex-col justify-between relative overflow-hidden group/url">
              {isWaitingForAsset ? (
                <div className="absolute inset-0 z-10 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-8 gap-5">
                  <div className="w-full space-y-3">
                    <div className="flex justify-between items-end text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary animate-pulse" />
                        Mengunduh...
                      </span>
                      <span className="text-primary text-sm">
                        {Math.round(downloadProgress)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner border border-border/20">
                      <div
                        className="h-full bg-gradient-to-r from-primary via-orange-500 to-rose-600 transition-all duration-300 ease-out"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 animate-pulse text-center">
                    Mencari kualitas visual terbaik...
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center group-hover/url:scale-110 transition-transform duration-300">
                  <LinkIcon className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-bold text-foreground">Impor dari URL</p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Tempel link YouTube, TikTok..."
                  leftIcon={<LinkIcon size={20} />}
                  value={importUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setImportUrl(e.target.value)
                  }
                  disabled={isLoading || isWaitingForAsset}
                />
                <Button
                  className="w-full rounded-2xl font-bold"
                  variant="default"
                  disabled={!importUrl || isLoading || isWaitingForAsset}
                  isLoading={isLoading && !isWaitingForAsset}
                  onClick={handleUrlImport}
                >
                  Mulai Impor
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {["YouTube", "TikTok", "Instagram", "Facebook"].map((platform) => (
              <Badge
                key={platform}
                variant="secondary"
                className="px-4 py-1.5 rounded-full cursor-pointer hover:bg-primary/10 hover:text-primary transition-all duration-300 border border-transparent hover:border-primary/20 font-bold text-[10px] uppercase tracking-wider"
              >
                {platform}
              </Badge>
            ))}
            <Badge
              variant="default"
              className="px-4 py-1.5 rounded-full cursor-pointer transition-all duration-300 font-bold text-[10px] uppercase tracking-wider"
              onClick={() => setIsSourcesModalOpen(true)}
            >
              <Plus size={14} className="mr-1.5" />
              Lainnya
            </Badge>
          </div>
        </CardBody>
      </Card>

      <SupportedSourcesModal
        isOpen={isSourcesModalOpen}
        onOpenChange={setIsSourcesModalOpen}
        onSelectPlatform={(_platform: string) => {
          // Optional: Prefill or focus input
        }}
      />
    </div>
  );
};
