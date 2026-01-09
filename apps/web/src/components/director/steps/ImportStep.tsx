import { useRef, useState } from "react";
import { useDirectorStore } from "@/stores/director-store";
import { authFetch } from "@/services/api";
import { Card, CardBody, Input, Button, Chip, cn } from "@heroui/react";
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
      // Force status to uploading locally for UI feedback
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

      // Upload to temp
      const uploadRes = await authFetch("/api/v1/upload/video", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success)
        throw new Error(uploadData.error?.message || "Upload failed");

      // Import as asset
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
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
        <CardBody className="p-8 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Wand2 className="w-10 h-10 text-primary" />
          </div>

          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-2">
              AI Director
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
              Buat konten viral secara otomatis! 🚀 <br />
              Dari video panjang ke Shorts siap upload dalam menit. <br />
              AI bantu temukan momen menarik, kamu pilih yang terbaik.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger bg-danger/10 px-4 py-2 rounded-lg text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="w-full grid md:grid-cols-2 gap-4 mt-4">
            {/* Upload Zone */}
            <div
              onClick={() =>
                !isWaitingForAsset && fileInputRef.current?.click()
              }
              className={cn(
                "group relative h-48 rounded-xl border-2 border-dashed border-zinc-700 transition-all flex flex-col items-center justify-center gap-3",
                isWaitingForAsset
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-primary hover:bg-white/5 cursor-pointer"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <FileVideo className="w-6 h-6 text-zinc-400 group-hover:text-primary" />
              </div>
              <div>
                <p className="font-semibold text-zinc-200 group-hover:text-white">
                  Upload Video
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  MP4, MOV hingga 200MB
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
            <div className="h-48 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6 flex flex-col justify-between relative overflow-hidden">
              {isWaitingForAsset ? (
                <div className="absolute inset-0 z-10 bg-zinc-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-4">
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-zinc-400 mb-2">
                      <span>Sedang mengunduh...</span>
                      <span>{Math.round(downloadProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 animate-pulse">
                    Mohon tunggu, mengambil video kualitas tinggi...
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="font-semibold text-zinc-200">Impor URL</p>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Tempel URL YouTube, TikTok..."
                  size="sm"
                  classNames={{
                    inputWrapper: "bg-zinc-800 border-zinc-700",
                  }}
                  value={importUrl}
                  onValueChange={setImportUrl}
                  isDisabled={isLoading || isWaitingForAsset}
                />
                <Button
                  fullWidth
                  size="sm"
                  color="primary"
                  variant="flat"
                  isDisabled={!importUrl || isLoading || isWaitingForAsset}
                  isLoading={isLoading && !isWaitingForAsset}
                  onPress={handleUrlImport}
                >
                  Impor
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {["YouTube", "TikTok", "Instagram", "Facebook"].map((platform) => (
              <Chip
                key={platform}
                size="sm"
                variant="flat"
                className="bg-zinc-800 text-zinc-400 cursor-pointer hover:bg-zinc-700 transition-colors"
                onClick={() => {
                  // If just a visual helper, maybe prefill input?
                  // For now, keep as visual indicator or focus input
                }}
              >
                {platform}
              </Chip>
            ))}
            <Chip
              size="sm"
              variant="flat"
              className="bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors border border-primary/20"
              startContent={<Plus size={12} />}
              onClick={() => setIsSourcesModalOpen(true)}
            >
              Lainnya
            </Chip>
          </div>
        </CardBody>
      </Card>

      <SupportedSourcesModal
        isOpen={isSourcesModalOpen}
        onOpenChange={setIsSourcesModalOpen}
        onSelectPlatform={(platform) => {
          // Optional: Prefill or just focus.
          // Since user has to paste URL anyway, maybe just focus input?
          // Let's just log or no-op for now unless we want to filter validation logic.
        }}
      />
    </div>
  );
};
