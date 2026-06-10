import {
  ArrowRight,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge, Button, Card, CardBody, Divider } from '@/components/ui';
import {
  HoverCard,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from '@/components/ui/PageTransition';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { useAnnouncements } from '@/hooks/use-announcements';
import { type ResolvedCommunityLink, resolveCommunityLink } from '@/lib/community-links';

const TELEGRAM_LINK = resolveCommunityLink(
  import.meta.env.VITE_TELEGRAM_URL,
  'https://t.me/vibecreator_id',
);
const WHATSAPP_LINK = resolveCommunityLink(import.meta.env.VITE_WHATSAPP_URL);

const communities = [
  {
    id: 'telegram',
    name: 'Telegram Group',
    description: 'Diskusi, tips, dan support dari komunitas creator terbaik di Indonesia.',
    icon: Send,
    link: TELEGRAM_LINK,
    members: '500+',
    color: 'blue',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Group',
    description: 'Grup whatsapp eksklusif untuk sharing, networking, dan info terupdate.',
    icon: MessageCircle,
    link: WHATSAPP_LINK,
    members: '200+',
    color: 'green',
  },
];

export function CommunityPage() {
  const { data: announcements = [], isError, isFetching, isLoading, refetch } = useAnnouncements();

  const isNew = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  return (
    <PageTransition className="space-y-8 pb-6 lg:pb-0">
      {/* Header Section */}
      <div className="flex flex-col justify-between gap-6 border-b border-border/30 pb-8 md:flex-row md:items-end">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary via-orange-500 to-rose-600">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
              Komunitas
            </h1>
          </div>
          <p className="text-muted-foreground font-black uppercase text-[10px] tracking-[0.2em] ml-16 transform -translate-y-1">
            Networking & Kolaborasi Creator Indonesia
          </p>
        </div>
      </div>

      {/* Join Community Section */}
      <StaggerContainer className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-primary" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
            Gabung Komunitas
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {communities.map((community) => (
            <StaggerItem key={community.id} className="h-full">
              <HoverCard className="h-full">
                <Card className="group h-full overflow-hidden border-border/50 bg-card/70 backdrop-blur-xl">
                  <CardBody className="p-6">
                    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                          community.color === 'blue' ? 'bg-blue-500/10' : 'bg-green-500/10'
                        } transition-transform duration-500 group-hover:scale-105`}
                      >
                        <community.icon
                          size={28}
                          className={
                            community.color === 'blue' ? 'text-blue-500' : 'text-green-500'
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
                        <div className="space-y-2">
                          <div className="flex flex-col items-center gap-2 sm:flex-row">
                            <h3 className="text-xl font-black tracking-tight">{community.name}</h3>
                            <Badge className="bg-muted/30 text-muted-foreground border-border/50 font-black uppercase text-[9px] tracking-widest px-3">
                              {community.members} Members
                            </Badge>
                          </div>
                          <p className="min-h-[2.9rem] max-w-[34ch] text-sm font-medium leading-relaxed text-muted-foreground line-clamp-2">
                            {community.description}
                          </p>
                        </div>
                        <CommunityJoinButton link={community.link} color={community.color} />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </HoverCard>
            </StaggerItem>
          ))}
        </div>
      </StaggerContainer>

      <Divider className="opacity-30" />

      {/* Announcements Section */}
      <StaggerContainer className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-orange-500" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
            Pengumuman Terbaru
          </h3>
        </div>

        {isLoading && (
          <SkeletonCard
            count={3}
            type="row"
            className="bg-card/70 backdrop-blur-xl border-border/50"
          />
        )}

        {!isLoading && isError && (
          <Card className="border-border/50 bg-card/70 backdrop-blur-xl">
            <CardBody className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
                <Megaphone size={22} className="text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black tracking-tight">Gagal memuat pengumuman</h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Coba muat ulang. Kalau masih gagal, pengumuman bisa dicek langsung di grup.
                </p>
              </div>
              <Button
                variant="secondary"
                className="h-10 rounded-xl font-black"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCw size={16} className={isFetching ? 'animate-spin' : undefined} />
                Coba Lagi
              </Button>
            </CardBody>
          </Card>
        )}

        {!isLoading && !isError && announcements.length === 0 && (
          <Card className="border-border/50 bg-card/60">
            <CardBody className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-muted/30">
                <Megaphone size={24} className="text-muted-foreground" />
              </div>
              <h3 className="font-black tracking-tight">Belum ada pengumuman</h3>
              <p className="mt-1 max-w-md text-sm font-medium text-muted-foreground">
                Update penting dari tim akan muncul di sini.
              </p>
            </CardBody>
          </Card>
        )}

        {!isLoading && !isError && announcements.length > 0 && (
          <div className="grid gap-4">
            {announcements.map((announcement) => (
              <StaggerItem key={announcement.id}>
                <Card className="bg-card/70 backdrop-blur-xl border-border/50 hover:border-primary/50 transition-all group">
                  <CardBody className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                          <Megaphone size={20} className="text-orange-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-black text-foreground tracking-tight">
                              {announcement.title}
                            </h3>
                            {isNew(announcement.createdAt) && (
                              <Badge className="bg-primary/20 text-primary border-primary/20 font-black uppercase text-[8px] tracking-widest px-2 animate-pulse">
                                Baru
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium line-clamp-2">
                            {announcement.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-border/30 pt-4 sm:pt-0 sm:pl-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Ditulis Pada
                        </span>
                        <span className="text-sm font-bold text-foreground/80">
                          {new Date(announcement.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            ))}
          </div>
        )}
      </StaggerContainer>

      <Card className="overflow-hidden border-border/50 bg-card/60">
        <CardBody className="flex flex-col items-center justify-between gap-4 p-5 text-center sm:flex-row sm:text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black tracking-tight">Butuh bantuan cepat?</h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Pilih Telegram atau WhatsApp di atas. Tim support dan member lain siap membantu.
            </p>
          </div>
        </CardBody>
      </Card>
    </PageTransition>
  );
}

function CommunityJoinButton({
  color,
  link,
}: {
  readonly color: string;
  readonly link: ResolvedCommunityLink;
}) {
  const baseClassName =
    'h-11 w-full rounded-xl border-none text-[10px] font-black uppercase tracking-widest sm:w-auto';
  const colorClassName =
    color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';

  if (!link.isAvailable || !link.href) {
    return (
      <div className="space-y-2">
        <Button disabled className={`${baseClassName} opacity-60`}>
          Belum Tersedia
        </Button>
        <p className="text-xs font-medium text-muted-foreground">
          {link.unavailableReason ?? 'Link komunitas belum tersedia.'}
        </p>
      </div>
    );
  }

  return (
    <Button asChild className={`${baseClassName} ${colorClassName}`}>
      <a href={link.href} target="_blank" rel="noopener noreferrer">
        Gabung Sekarang
        <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1" />
      </a>
    </Button>
  );
}
