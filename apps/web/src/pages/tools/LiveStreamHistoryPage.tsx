import { useEffect, useState } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Button, Card, CardBody, Chip, Spinner, Divider } from "@heroui/react";
import { Link } from "react-router-dom";
import { Radio, Play, Zap, Square, Video, Tv } from "lucide-react";
import { authFetch } from "@/services/api";
import { TopupModal } from "@/components/tools/TopupModal";
import toast from "react-hot-toast";

interface StreamSession {
  id: string;
  platform: string;
  status: "PENDING" | "LIVE" | "ENDED" | "FAILED";
  startedAt: string;
  endedAt: string | null;
  durationMinutesBilled: number;
  stopReason: string | null;
}

export function LiveStreamHistoryPage() {
  const [streams, setStreams] = useState<StreamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await authFetch("/api/v1/stream/history");
      if (res.ok) {
        const data = await res.json();
        setStreams(data.data.streams);
      }
    } catch (e) {
      console.error(e);
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
        toast.success("Stream berhasil dihentikan");
        fetchHistory(); // Refresh list to show updated status
      } else {
        const data = await res.json();
        throw new Error(data.error?.message || "Gagal menghentikan stream");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const statusColorMap: Record<
    string,
    "success" | "danger" | "warning" | "default"
  > = {
    LIVE: "success",
    ENDED: "default",
    FAILED: "danger",
    PENDING: "warning",
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
            <p className="text-foreground/60 text-sm mt-1">
              Riwayat aktivitas live streaming dan pemakaian kuota Anda.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="flat"
              color="warning"
              startContent={<Zap size={18} />}
              onPress={() => setShowTopup(true)}
            >
              Top Up Quota
            </Button>
            <Button
              as={Link}
              to="/tools/live-stream"
              color="primary"
              startContent={<Play size={18} />}
              className="font-semibold shadow-lg shadow-primary/20"
            >
              Mulai Live Baru
            </Button>
          </div>
        </div>

        <TopupModal isOpen={showTopup} onClose={() => setShowTopup(false)} />

        {/* Content */}
        {isLoading ? (
          <Card>
            <CardBody className="p-12 flex justify-center">
              <Spinner size="lg" />
            </CardBody>
          </Card>
        ) : streams.length === 0 ? (
          // Empty State
          <Card>
            <CardBody>
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-content2 flex items-center justify-center mb-2">
                  <Radio size={32} className="text-foreground/40" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Belum ada riwayat stream
                  </h3>
                  <p className="text-foreground/60 text-sm max-w-sm mx-auto">
                    Mulai streaming pertama Anda sekarang untuk menjangkau
                    audiens di berbagai platform.
                  </p>
                </div>
                <Button
                  as={Link}
                  to="/tools/live-stream"
                  variant="flat"
                  color="primary"
                  className="mt-4"
                >
                  Buat Stream Pertama
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.map((stream) => (
              <Card
                key={stream.id}
                className="border border-divider/50 shadow-sm hover:shadow-md transition-all"
              >
                <CardBody className="p-4 space-y-4">
                  {/* Header: Status & Platform */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-full bg-${
                          statusColorMap[stream.status]
                        }/10 text-${statusColorMap[stream.status]}`}
                      >
                        {stream.platform === "youtube" && <Video size={18} />}
                        {stream.platform === "twitch" && <Tv size={18} />}
                        {stream.platform !== "youtube" &&
                          stream.platform !== "twitch" && <Radio size={18} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold capitalize">
                          {stream.platform}
                        </h4>
                        <Chip
                          color={statusColorMap[stream.status]}
                          size="sm"
                          variant="flat"
                          className="h-5 text-[10px]"
                          startContent={
                            stream.status === "LIVE" ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse ml-1" />
                            ) : undefined
                          }
                        >
                          {stream.status}
                        </Chip>
                      </div>
                    </div>

                    {/* Stop Button for Active Streams */}
                    {stream.status === "LIVE" && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        startContent={<Square size={14} fill="currentColor" />}
                        onPress={() => handleStopStream(stream.id)}
                      >
                        Stop
                      </Button>
                    )}
                  </div>

                  <Divider />

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Waktu Mulai</span>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatDate(stream.startedAt)}
                        </div>
                        <div className="text-xs text-foreground/50">
                          {formatTime(stream.startedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-foreground/60">Durasi</span>
                      <span className="font-medium">
                        {stream.status === "LIVE" ? (
                          <span className="text-success animate-pulse">
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
                        <span className="text-foreground/60">
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
