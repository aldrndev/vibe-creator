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

  const statusVariantMap: Record<
    string,
    "default" | "destructive" | "outline" | "secondary"
  > = {
    LIVE: "default",
    ENDED: "secondary",
    FAILED: "destructive",
    PENDING: "outline",
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
    <PageTransition className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Radio size={24} className="text-primary" />
              Live Stream History
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Riwayat aktivitas live streaming dan pemakaian kuota Anda.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowTopup(true)}>
              <Zap size={18} />
              Top Up Quota
            </Button>
            <Button
              asChild
              className="font-semibold shadow-lg shadow-primary/20"
            >
              <Link to="/tools/live-stream">
                <Play size={18} />
                Mulai Live Baru
              </Link>
            </Button>
          </div>
        </div>

        <TopupModal isOpen={showTopup} onClose={() => setShowTopup(false)} />

        {/* Inline Feedback Banner */}
        {feedback && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span className="text-sm font-medium">{feedback.text}</span>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <Card>
            <CardBody className="p-12 flex justify-center">
              <Spinner size="lg" />
            </CardBody>
          </Card>
        ) : streams.length === 0 ? (
          <Card>
            <CardBody>
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Radio size={32} className="text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Belum ada riwayat stream
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Mulai streaming pertama Anda sekarang untuk menjangkau
                    audiens di berbagai platform.
                  </p>
                </div>
                <Button asChild variant="secondary" className="mt-4">
                  <Link to="/tools/live-stream">Buat Stream Pertama</Link>
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.map((stream) => (
              <Card
                key={stream.id}
                className="border border-border/50 shadow-sm hover:shadow-md transition-all"
              >
                <CardBody className="p-4 space-y-4">
                  {/* Header: Status & Platform */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-muted">
                        {stream.platform === "youtube" && <Video size={18} />}
                        {stream.platform === "twitch" && <Tv size={18} />}
                        {stream.platform !== "youtube" &&
                          stream.platform !== "twitch" && <Radio size={18} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold capitalize">
                          {stream.platform}
                        </h4>
                        <Badge
                          variant={statusVariantMap[stream.status]}
                          className="h-5 text-[10px]"
                        >
                          {stream.status === "LIVE" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1" />
                          )}
                          {stream.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Stop Button for Active Streams */}
                    {stream.status === "LIVE" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStopStream(stream.id)}
                      >
                        <Square size={14} fill="currentColor" />
                        Stop
                      </Button>
                    )}
                  </div>

                  <Divider />

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Waktu Mulai</span>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatDate(stream.startedAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(stream.startedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Durasi</span>
                      <span className="font-medium">
                        {stream.status === "LIVE" ? (
                          <span className="text-green-500 animate-pulse">
                            Sedang Berlangsung
                          </span>
                        ) : (
                          <span>
                            {stream.durationMinutesBilled || 0} Menit (Billed)
                          </span>
                        )}
                      </span>
                    </div>

                    {stream.stopReason && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Berhenti Karena
                        </span>
                        <span className="font-medium capitalize text-foreground/80">
                          {stream.stopReason.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
