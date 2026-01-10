import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
  ScrollArea,
} from "@/components/ui";
import {
  Smartphone,
  MessageCircle,
  Video,
  Music,
  Globe,
  Tv,
} from "lucide-react";

interface SupportedSourcesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectPlatform: (platformName: string) => void;
}

const CATEGORIES = [
  {
    name: "Platform Video",
    icon: Video,
    platforms: [
      "YouTube",
      "Vimeo",
      "Dailymotion",
      "Bilibili",
      "Rutube",
      "Odysee",
      "Google Drive",
    ],
  },
  {
    name: "Video Pendek",
    icon: Smartphone,
    platforms: [
      "TikTok",
      "Instagram Reels",
      "Facebook Reels",
      "Pinterest",
      "Snapchat",
      "Likee",
      "Dubsmash",
    ],
  },
  {
    name: "Media Sosial",
    icon: MessageCircle,
    platforms: [
      "Twitter / X",
      "Reddit",
      "Tumblr",
      "Threads",
      "LinkedIn",
      "VK",
      "Weibo",
    ],
  },
  {
    name: "Live Streaming",
    icon: Tv,
    platforms: ["Twitch", "Kick", "Periscope", "Niconico"],
  },
  {
    name: "Musik & Audio",
    icon: Music,
    platforms: ["SoundCloud", "Mixcloud", "Bandcamp"],
  },
  {
    name: "Berita & Lainnya",
    icon: Globe,
    platforms: ["BBC", "CNN", "Ted", "Mashable", "BuzzFeed", "ESPN"],
  },
];

export const SupportedSourcesModal = ({
  isOpen,
  onOpenChange,
  onSelectPlatform,
}: SupportedSourcesModalProps) => {
  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Sumber yang Didukung
          </DialogTitle>
          <p className="text-sm font-normal text-zinc-400">
            Anda dapat mengimpor konten dari 100+ website yang didukung.
          </p>
        </DialogHeader>
        <ScrollArea className="h-[400px] px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CATEGORIES.map((category) => (
              <div key={category.name} className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-200">
                  <category.icon className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{category.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {category.platforms.map((platform) => (
                    <Badge
                      key={platform}
                      variant="secondary"
                      className="cursor-pointer hover:bg-zinc-700 transition-colors"
                      onClick={() => {
                        onSelectPlatform(platform);
                        handleClose();
                      }}
                    >
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <h4 className="font-semibold text-primary mb-1">
              Dukungan Link Universal
            </h4>
            <p className="text-xs text-zinc-400">
              Apakah link Anda bisa dibuka di web? Cobalah! Sistem kami didukung
              oleh tools standar industri yang mendukung ribuan website di luar
              daftar ini.
            </p>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
