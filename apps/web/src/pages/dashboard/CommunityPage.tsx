import { Card, CardBody, Button, Badge, Divider } from "@/components/ui";
import {
  MessageCircle,
  Send,
  Users,
  Megaphone,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  HoverCard,
} from "@/components/ui/PageTransition";
import { SkeletonCard } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAnnouncements } from "@/hooks/use-announcements";

const TELEGRAM_URL =
  import.meta.env.VITE_TELEGRAM_URL || "https://t.me/vibecreator_id";
const WHATSAPP_URL =
  import.meta.env.VITE_WHATSAPP_URL ||
  "https://chat.whatsapp.com/your-group-link";

const communities = [
  {
    id: "telegram",
    name: "Telegram Group",
    description:
      "Diskusi, tips, dan support dari komunitas creator terbaik di Indonesia.",
    icon: Send,
    link: TELEGRAM_URL,
    members: "500+",
    color: "blue",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Group",
    description:
      "Grup whatsapp eksklusif untuk sharing, networking, dan info terupdate.",
    icon: MessageCircle,
    link: WHATSAPP_URL,
    members: "200+",
    color: "green",
  },
];

export function CommunityPage() {
  const { data: announcements = [], isLoading } = useAnnouncements();

  const isNew = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays <= 7;
  };

  return (
    <PageTransition className="pb-20 lg:pb-10 space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/30 pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
              <Users className="text-white w-7 h-7" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-rose-600">
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
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
            Gabung Komunitas
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communities.map((community) => (
            <StaggerItem key={community.id} className="h-full">
              <HoverCard className="h-full">
                <Card className="bg-card/70 backdrop-blur-xl border-border/50 group overflow-hidden h-full">
                  <CardBody className="p-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                      <div
                        className={`w-16 h-16 rounded-3xl ${
                          community.color === "blue"
                            ? "bg-blue-500/10"
                            : "bg-green-500/10"
                        } flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-500`}
                      >
                        <community.icon
                          size={32}
                          className={
                            community.color === "blue"
                              ? "text-blue-500"
                              : "text-green-500"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-center sm:text-left space-y-4">
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <h3 className="text-xl font-black tracking-tight">
                              {community.name}
                            </h3>
                            <Badge className="bg-muted/30 text-muted-foreground border-border/50 font-black uppercase text-[9px] tracking-widest px-3">
                              {community.members} Members
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                            {community.description}
                          </p>
                        </div>
                        <Button
                          asChild
                          className={`w-full sm:w-auto h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] ${
                            community.color === "blue"
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-green-600 hover:bg-green-700"
                          } border-none`}
                        >
                          <a
                            href={community.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Gabung Sekarang
                            <ArrowRight
                              size={14}
                              className="ml-2 group-hover:translate-x-1 transition-transform"
                            />
                          </a>
                        </Button>
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
          <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
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

        {!isLoading && announcements.length === 0 && (
          <EmptyState
            type="announcements"
            description="Belum ada pengumuman terbaru untuk saat ini."
          />
        )}

        {!isLoading && announcements.length > 0 && (
          <div className="grid gap-4">
            {announcements.map((announcement) => (
              <StaggerItem key={announcement.id}>
                <Card className="bg-card/70 backdrop-blur-xl border-border/50 hover:border-primary/50 transition-all group">
                  <CardBody className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
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
                          {new Date(announcement.createdAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
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

      {/* Footer CTA */}
      <Card className="bg-card/70 backdrop-blur-xl border-border/50 group overflow-hidden">
        <CardBody className="p-10 text-center relative z-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="text-primary w-8 h-8" />
          </div>
          <div className="max-w-xl mx-auto space-y-3">
            <h3 className="text-2xl font-black tracking-tighter">
              Bantuan Selalu Tersedia
            </h3>
            <p className="text-muted-foreground font-medium">
              Ada pertanyaan atau butuh bantuan teknis? Langsung tanya di grup
              kami. Tim support dan member lain siap membantu 24/7!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-blue-600 hover:bg-blue-700 border-none px-10"
            >
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                <Send size={18} className="mr-3" />
                Telegram Group
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              className="h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-green-600 hover:bg-green-700 border-none px-10"
            >
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} className="mr-3" />
                WhatsApp Group
              </a>
            </Button>
          </div>
        </CardBody>
      </Card>
    </PageTransition>
  );
}
