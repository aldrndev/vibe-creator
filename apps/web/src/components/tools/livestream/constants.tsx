import { Radio, Settings, Tv, Video } from "lucide-react";
import { StreamPlatform } from "@/hooks/useLiveStream";

export const platformConfigs: Record<
  StreamPlatform,
  {
    name: string;
    icon: React.ReactNode;
    color: "danger" | "default" | "secondary" | "primary" | "warning";
  }
> = {
  youtube: { name: "YouTube", icon: <Video size={20} />, color: "danger" },
  tiktok: { name: "TikTok", icon: <Radio size={20} />, color: "default" },
  twitch: { name: "Twitch", icon: <Tv size={20} />, color: "secondary" },
  facebook: { name: "Facebook", icon: <Radio size={20} />, color: "primary" },
  instagram: { name: "Instagram", icon: <Radio size={20} />, color: "warning" },
  custom: {
    name: "Custom RTMP",
    icon: <Settings size={20} />,
    color: "default",
  },
};
