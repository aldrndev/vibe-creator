import { useEffect, useState } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import {
  Button,
  Card,
  CardBody,
  Badge,
  Divider,
  Spinner,
} from "@/components/ui";
import { Link } from "react-router-dom";
import {
  Radio,
  Play,
  Zap,
  Square,
  Video,
  Tv,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { authFetch } from "@/services/api";
import { TopupModal } from "@/components/tools/TopupModal";
import { cn } from "@/lib/utils";

interface StreamSession {
  id: string;
  platform: string;
  status: "PENDING" | "LIVE" | "ENDED" | "FAILED";
  startedAt: string;
  endedAt: string | null;
  durationMinutesBilled: number;
  stopReason: string | null;
}

interface FeedbackMessage {
  type: "success" | "error";
  text: string;
}

export function LiveStreamHistoryPage() {
  const [streams, setStreams] = useState<StreamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const fetchHistory = async () => {
    try {
      const res = await authFetch("/api/v1/stream/history");
      if (res.ok) {
        const data = await res.json();
        setStreams(data.data.streams);
      }
    } catch (e) {
      setFeedback({ type: "error", text: "Gagal memuat riwayat stream" });
      void e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopStream = async (streamId: string) => {
    try {
      const res = await authFetch("/api/v1/stream/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ streamId }),
      });

      if (res.ok) {
        setFeedback({ type: "success", text: "Stream berhasil dihentikan" });
        fetchHistory();
      } else {
        const data = await res.json();
        throw new Error(data.error?.message || "Gagal menghentikan stream");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Gagal menghentikan stream";
      setFeedback({ type: "error", text: message });
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const formatTime = (dateString: string) => {
    return (
      new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(dateString)) + " WIB"
    );
  };

  return (
    <PageTransition className="min-h-screen bg-background pb-20 lg:pb-10 pt-6 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
                <Radio className="text-white w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-rose-600">
                Riwayat Siaran
              </h1>
            </div>
            <p className="text-muted-foreground font-medium text-sm ml-1">
              Pantau aktivitas live streaming dan pemakaian kuota 24/7 Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowTopup(true)}
              className="flex-1 md:flex-none h-12 rounded-xl bg-muted/20 border-border/50 font-bold uppercase tracking-widest text-[10px]"
            >
              <Zap size={14} className="mr-2 text-primary fill-primary/20" />
              Top Up Quota
            </Button>
            <Button
              asChild
              className="flex-1 md:flex-none h-12 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
            >
              <Link to="/tools/live-stream">
                <Play size={14} className="mr-2 fill-current" />
                Live Baru
              </Link>
            </Button>
          </div>
        </div>

        <TopupModal isOpen={showTopup} onClose={() => setShowTopup(false)} />

        {/* Inline Feedback Banner */}
        {feedback && (
          <div
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
            )}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span className="text-xs font-black uppercase tracking-widest">
              {feedback.text}
            </span>
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
          <div className="flex justify-center items-center py-40">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : streams.length === 0 ? (
          <Card className="bg-card/70 backdrop-blur-xl border-border/50 overflow-hidden">
            <CardBody className="py-24 px-6 text-center">
              <div className="relative inline-flex mb-8">
                <div className="absolute inset-0 bg-primary/5 rounded-full" />
                <div className="relative w-24 h-24 rounded-full bg-muted/10 flex items-center justify-center border border-border">
                  <Radio size={40} className="text-muted-foreground/40" />
                </div>
              </div>
              <h3 className="text-2xl font-black tracking-tighter uppercase mb-3">
                Belum ada Riwayat
              </h3>
              <p className="text-muted-foreground font-medium text-sm max-w-sm mx-auto mb-10">
                Mulai siarkan konten Anda 24/7 dan tampil di berbagai platform
                sekaligus.
              </p>
              <Button
                asChild
                size="lg"
                className="rounded-full px-8 font-black uppercase tracking-widest text-[10px]"
              >
                <Link to="/tools/live-stream">Siaran Sekarang</Link>
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
            {streams.map((stream) => (
              <Card
                key={stream.id}
                className="bg-card/70 backdrop-blur-xl border-border/50 overflow-hidden transition-all duration-300 hover:border-primary/50 group/card flex flex-col"
              >
                <CardBody className="p-6 flex flex-col h-full space-y-6">
                  {/* Card Header: Platform & Status */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center border border-border/50 transition-all group-hover/card:bg-primary/10 group-hover/card:border-primary/20 group-hover/card:scale-110">
                        {stream.platform === "youtube" && (
                          <Video size={22} className="text-rose-500" />
                        )}
                        {stream.platform === "twitch" && (
                          <Tv size={22} className="text-purple-500" />
                        )}
                        {stream.platform !== "youtube" &&
                          stream.platform !== "twitch" && (
                            <Radio size={22} className="text-primary" />
                          )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-black uppercase tracking-widest leading-none">
                          {stream.platform}
                        </h4>
                        <Badge
                          className={cn(
                            "h-5 px-2 rounded-full text-[9px] font-black tracking-widest border-transparent",
                            stream.status === "LIVE"
                              ? "bg-rose-500 text-white animate-pulse"
                              : stream.status === "ENDED"
                              ? "bg-muted text-muted-foreground"
                              : stream.status === "FAILED"
                              ? "bg-rose-900 text-rose-200"
                              : "bg-primary/20 text-primary"
                          )}
                        >
                          {stream.status === "LIVE" && (
                            <span className="w-1 h-1 rounded-full bg-white mr-1.5" />
                          )}
                          {stream.status}
                        </Badge>
                      </div>
                    </div>

                    {stream.status === "LIVE" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all active:scale-95 px-3"
                        onClick={() => handleStopStream(stream.id)}
                      >
                        <Square size={14} className="mr-1.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Stop
                        </span>
                      </Button>
                    )}
                  </div>

                  <Divider className="opacity-40" />

                  {/* Details Grid */}
                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Mulai Pada
                        </span>
                        <span className="text-sm font-bold">
                          {formatDate(stream.startedAt)}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-muted-foreground bg-muted/10 px-2 py-1 rounded-lg border border-border/50">
                        {formatTime(stream.startedAt)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-muted/5 p-4 rounded-2xl border border-border/40">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">
                        Durasi Akumulasi
                      </span>
                      {stream.status === "LIVE" ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                            Live Sekarang
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-black uppercase tracking-widest text-foreground">
                          {stream.durationMinutesBilled || 0} Menit
                        </span>
                      )}
                    </div>

                    {stream.stopReason && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Berhenti Karena
                        </span>
                        <div className="px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
                          <span className="text-[10px] font-black uppercase tracking-tight text-orange-600/80">
                            {stream.stopReason.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Bar for Ended Streams */}
                  {stream.status !== "LIVE" && (
                    <div className="pt-2">
                      <Button
                        asChild
                        variant="ghost"
                        className="w-full justify-between items-center rounded-xl bg-muted/5 border border-border/50 hover:bg-muted/20 group/btn"
                      >
                        <Link to="/tools/live-stream">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover/btn:text-foreground">
                            Siaran Ulang
                          </span>
                          <Play
                            size={14}
                            className="text-muted-foreground group-hover/btn:text-primary transition-colors"
                          />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
