import { Link } from '@tanstack/react-router';
import { AlertCircle, CheckCircle2, Play, Radio, Square, Tv, Video, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopupModal } from '@/components/tools/TopupModal';
import { Badge, Button, Card, CardBody, Spinner } from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import {
  formatLiveStreamElapsed,
  getStreamQuotaUsageLabel,
  getStreamStatusPresentation,
  getStreamStopReasonLabel,
  isLiveLikeStreamStatus,
} from '@/lib/live-stream-history';
import { cn } from '@/lib/utils';
import {
  getStreamHistory,
  type StreamStatusRecord,
  stopStream,
} from '@/services/live-stream-project-api';
import { useAuthStore } from '@/stores/auth-store';

type StreamSession = StreamStatusRecord;
const STREAM_HISTORY_PAGE_SIZE = 10;

interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    twitch: 'Twitch',
    facebook: 'Facebook',
    instagram: 'Instagram',
    custom: 'Custom RTMP',
  };

  return labels[platform] ?? platform;
}

export function LiveStreamHistoryPage() {
  const user = useAuthStore((state) => state.user);
  const [streams, setStreams] = useState<StreamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showTopup, setShowTopup] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [now, setNow] = useState(() => new Date());

  const sortedStreams = useMemo(
    () =>
      [...streams].sort((first, second) => {
        const firstActive = isLiveLikeStreamStatus(first.status);
        const secondActive = isLiveLikeStreamStatus(second.status);
        if (firstActive !== secondActive) return firstActive ? -1 : 1;
        return new Date(second.startedAt).getTime() - new Date(first.startedAt).getTime();
      }),
    [streams],
  );
  const activeStreams = useMemo(
    () => sortedStreams.filter((stream) => isLiveLikeStreamStatus(stream.status)),
    [sortedStreams],
  );
  const historyStreams = useMemo(
    () => sortedStreams.filter((stream) => !isLiveLikeStreamStatus(stream.status)),
    [sortedStreams],
  );
  const canTopUpQuota = user ? user.role !== 'ADMIN' : false;

  const fetchHistory = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setIsLoadingMore(true);
      }
      const response = await getStreamHistory({ limit: STREAM_HISTORY_PAGE_SIZE, cursor });
      setStreams((current) => (cursor ? [...current, ...response.streams] : response.streams));
      setNextCursor(response.nextCursor);
    } catch {
      setFeedback({ type: 'error', text: 'Gagal memuat riwayat stream' });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const handleStopStream = async (streamId: string) => {
    try {
      await stopStream(streamId);
      setFeedback({ type: 'success', text: 'Stream berhasil dihentikan' });
      fetchHistory();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Gagal menghentikan stream';
      setFeedback({ type: 'error', text: message });
    }
  };

  const formatDate = (dateString: string | Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const formatTime = (dateString: string | Date) => {
    return `${new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateString))} WIB`;
  };

  const formatTimeRange = (stream: StreamSession) => {
    const start = `${formatDate(stream.startedAt)}, ${formatTime(stream.startedAt)}`;
    if (!stream.endedAt) {
      return start;
    }
    return `${start} - ${formatTime(stream.endedAt)}`;
  };

  return (
    <PageTransition className="min-h-screen bg-background px-4 pt-6 pb-8 md:px-8 lg:pb-0">
      <div className="max-w-350 mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
                <Radio className="text-white w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
                Riwayat Siaran
              </h1>
            </div>
            <p className="text-muted-foreground font-medium text-sm ml-1">
              Pantau aktivitas live streaming dan pemakaian kuota Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {canTopUpQuota && (
              <Button
                variant="outline"
                onClick={() => setShowTopup(true)}
                className="flex-1 md:flex-none h-12 rounded-xl bg-muted/20 border-border/50 font-bold uppercase tracking-widest text-[10px]"
              >
                <Zap size={14} className="mr-2 text-primary fill-primary/20" />
                Top Up Quota
              </Button>
            )}
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

        {canTopUpQuota && <TopupModal isOpen={showTopup} onClose={() => setShowTopup(false)} />}

        {/* Inline Feedback Banner */}
        {feedback && (
          <div
            className={cn(
              'p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300',
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
            )}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-xs font-black uppercase tracking-widest">{feedback.text}</span>
          </div>
        )}

        {/* Content Area */}
        {(() => {
          if (isLoading) {
            return (
              <div className="flex justify-center items-center py-40">
                <Spinner size="lg" className="text-primary" />
              </div>
            );
          }

          if (streams.length === 0) {
            return (
              <Card className="bg-card/70 border-border/50 overflow-hidden">
                <CardBody className="py-24 px-6 text-center">
                  <div className="relative inline-flex mb-8">
                    <div className="absolute inset-0 bg-primary/5 rounded-full" />
                    <div className="relative w-24 h-24 rounded-full bg-muted/10 flex items-center justify-center border border-border">
                      <Radio size={40} className="text-muted-foreground/40" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase mb-3">
                    Belum ada riwayat siaran
                  </h3>
                  <p className="text-muted-foreground font-medium text-sm max-w-sm mx-auto mb-10">
                    Stream yang sudah live atau memakai quota akan muncul di sini.
                  </p>
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full px-8 font-black uppercase tracking-widest text-[10px]"
                  >
                    <Link to="/tools/live-stream">Mulai Live Baru</Link>
                  </Button>
                </CardBody>
              </Card>
            );
          }

          return (
            <div className="space-y-8">
              {activeStreams.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Sedang Live</h2>
                      <p className="text-sm font-medium text-muted-foreground">
                        Stream aktif yang sedang berjalan di server.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeStreams.map((stream) => {
                      const statusPresentation = getStreamStatusPresentation(stream);
                      return (
                        <Card
                          key={stream.id}
                          className="overflow-hidden border-rose-500/25 bg-rose-500/[0.035]"
                        >
                          <CardBody className="p-5 sm:p-6">
                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
                                  <Radio size={22} className="text-rose-400" />
                                </div>
                                <div className="min-w-0">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge className="h-6 rounded-full border-transparent bg-rose-500 px-2.5 text-[10px] font-black tracking-widest text-white">
                                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                                      {statusPresentation.label}
                                    </Badge>
                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                      {getPlatformLabel(stream.platform)}
                                    </span>
                                  </div>
                                  <h3 className="truncate text-lg font-black text-foreground">
                                    {getPlatformLabel(stream.platform)} Live Stream
                                  </h3>
                                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                                    Mulai {formatTimeRange(stream)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 md:items-end">
                                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-black text-rose-300">
                                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                                  {stream.status === 'LIVE'
                                    ? formatLiveStreamElapsed(stream.startedAt, now)
                                    : statusPresentation.label}
                                </span>
                                <Button
                                  variant="secondary"
                                  className="h-11 rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 font-black text-rose-300 hover:bg-rose-500 hover:text-white"
                                  onClick={() => handleStopStream(stream.id)}
                                >
                                  <Square size={15} className="mr-2 fill-current" />
                                  Stop
                                </Button>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Riwayat Terbaru</h2>
                    <p className="text-sm font-medium text-muted-foreground">
                      Siaran yang sudah selesai atau sempat live lalu terputus.
                    </p>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {historyStreams.length} ditampilkan
                  </span>
                </div>

                {historyStreams.length === 0 ? (
                  <Card className="border-border/50 bg-card/70">
                    <CardBody className="p-8 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-muted/10">
                        <Radio size={24} className="text-muted-foreground/60" />
                      </div>
                      <h3 className="text-lg font-black">Belum ada riwayat selesai</h3>
                      <p className="mt-2 text-sm font-medium text-muted-foreground">
                        Stream aktif akan pindah ke sini setelah selesai.
                      </p>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {historyStreams.map((stream) => {
                      const statusPresentation = getStreamStatusPresentation(stream);
                      const quotaLabel = getStreamQuotaUsageLabel(stream);
                      return (
                        <Card
                          key={stream.id}
                          className="border-border/50 bg-card/70 transition-colors hover:border-primary/30"
                        >
                          <CardBody className="p-4 sm:p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-muted/10">
                                  {stream.platform === 'youtube' && (
                                    <Video size={21} className="text-rose-400" />
                                  )}
                                  {stream.platform === 'twitch' && (
                                    <Tv size={21} className="text-purple-400" />
                                  )}
                                  {stream.platform !== 'youtube' &&
                                    stream.platform !== 'twitch' && (
                                      <Radio size={21} className="text-primary" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-foreground">
                                      {getPlatformLabel(stream.platform)}
                                    </span>
                                    <Badge
                                      className={cn(
                                        'h-5 rounded-full border-transparent px-2 text-[9px] font-black tracking-widest',
                                        statusPresentation.className,
                                      )}
                                    >
                                      {statusPresentation.label}
                                    </Badge>
                                  </div>
                                  <p className="truncate text-sm font-semibold text-muted-foreground">
                                    {formatTimeRange(stream)}
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:min-w-105 lg:items-center">
                                <div className="min-w-0 rounded-xl border border-border/40 bg-muted/5 px-3 py-2">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Quota terpakai
                                  </p>
                                  <p
                                    className={cn(
                                      'mt-1 truncate text-sm font-black',
                                      (stream.durationMinutesBilled ?? 0) > 0
                                        ? 'text-foreground'
                                        : 'text-muted-foreground',
                                    )}
                                  >
                                    {quotaLabel.replace('Quota terpakai: ', '')}
                                  </p>
                                  {stream.stopReason && (
                                    <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
                                      Status akhir: {getStreamStopReasonLabel(stream.stopReason)}
                                    </p>
                                  )}
                                </div>

                                <Button
                                  asChild
                                  variant="outline"
                                  className="h-11 justify-between rounded-xl border-border/50 bg-muted/10 px-4 font-black"
                                >
                                  <Link to="/tools/live-stream">
                                    Siaran Ulang
                                    <Play size={14} className="ml-3" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>

              {nextCursor && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    className="rounded-full px-6 font-black"
                    disabled={isLoadingMore}
                    onClick={() => fetchHistory(nextCursor)}
                  >
                    {isLoadingMore ? 'Memuat...' : 'Muat Lagi'}
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </PageTransition>
  );
}
