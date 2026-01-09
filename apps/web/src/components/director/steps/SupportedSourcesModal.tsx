import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  ScrollShadow,
} from "@heroui/react";
import { Instagram, Twitter, Video, Music, Globe, Tv } from "lucide-react";

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
    icon: Instagram,
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
    icon: Twitter,
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
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
      classNames={{
        base: "bg-zinc-900 border border-zinc-800",
        header: "border-b border-zinc-800",
        footer: "border-t border-zinc-800",
        closeButton: "hover:bg-white/10 active:bg-white/20",
      }}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">Sumber yang Didukung</h2>
              <p className="text-sm font-normal text-zinc-400">
                Anda dapat mengimpor konten dari 100+ website yang didukung.
              </p>
            </ModalHeader>
            <ModalBody className="p-0">
              <ScrollShadow className="h-[400px] p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {CATEGORIES.map((category) => (
                    <div key={category.name} className="space-y-3">
                      <div className="flex items-center gap-2 text-zinc-200">
                        <category.icon className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">
                          {category.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {category.platforms.map((platform) => (
                          <Chip
                            key={platform}
                            size="sm"
                            variant="flat"
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
                            onClick={() => {
                              onSelectPlatform(platform); // Just fills/copies
                              onClose();
                            }}
                          >
                            {platform}
                          </Chip>
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
                    Apakah link Anda bisa dibuka di web? Cobalah! Sistem kami
                    didukung oleh tools standar industri yang mendukung ribuan
                    website di luar daftar ini.
                  </p>
                </div>
              </ScrollShadow>
            </ModalBody>
            <ModalFooter>
              <Button
                color="primary"
                variant="light"
                onPress={onClose}
                size="sm"
              >
                Tutup
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
