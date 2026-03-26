import { Globe, MessageCircle, Music, Smartphone, Tv, Video } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from '@/components/ui';

interface SupportedSourcesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectPlatform: (platformName: string) => void;
}

const CATEGORIES = [
  {
    name: 'Platform Video',
    icon: Video,
    platforms: ['YouTube', 'Vimeo', 'Dailymotion', 'Bilibili', 'Rutube', 'Odysee', 'Google Drive'],
  },
  {
    name: 'Video Pendek',
    icon: Smartphone,
    platforms: [
      'TikTok',
      'Instagram Reels',
      'Facebook Reels',
      'Pinterest',
      'Snapchat',
      'Likee',
      'Dubsmash',
    ],
  },
  {
    name: 'Media Sosial',
    icon: MessageCircle,
    platforms: ['Twitter / X', 'Reddit', 'Tumblr', 'Threads', 'LinkedIn', 'VK', 'Weibo'],
  },
  {
    name: 'Live Streaming',
    icon: Tv,
    platforms: ['Twitch', 'Kick', 'Periscope', 'Niconico'],
  },
  {
    name: 'Musik & Audio',
    icon: Music,
    platforms: ['SoundCloud', 'Mixcloud', 'Bandcamp'],
  },
  {
    name: 'Berita & Lainnya',
    icon: Globe,
    platforms: ['BBC', 'CNN', 'Ted', 'Mashable', 'BuzzFeed', 'ESPN'],
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
      <DialogContent className="bg-card/90 border-border/50 backdrop-blur-2xl max-w-2xl rounded-4xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-br from-primary via-orange-500 to-rose-600">
            Sumber yang Didukung
          </DialogTitle>
          <p className="text-muted-foreground font-medium mt-1">
            Impor konten dari 100+ platform populer di dunia. 🌎
          </p>
        </DialogHeader>

        <ScrollArea className="h-[450px] px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {CATEGORIES.map((category) => (
              <div key={category.name} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <category.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-widest text-foreground/80">
                    {category.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {category.platforms.map((platform) => (
                    <Badge
                      key={platform}
                      variant="secondary"
                      className="px-3 py-1 rounded-full cursor-pointer hover:bg-primary/10 hover:text-primary transition-all duration-300 border border-transparent hover:border-primary/20 font-bold text-[10px] uppercase tracking-wider bg-muted/30"
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

          <div className="mt-10 p-6 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Dukungan Link Universal
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              Sistem kami didukung oleh teknologi standar industri yang mampu mendeteksi video dari
              ribuan website. Jika website Anda memiliki video publik, kemungkinan besar kami bisa
              memprosesnya!
            </p>
          </div>
        </ScrollArea>

        <div className="p-6 bg-muted/20 border-t border-border/50 flex justify-end">
          <Button
            variant="ghost"
            className="rounded-xl font-bold px-6 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
