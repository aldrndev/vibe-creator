import { Card, CardBody } from "@heroui/react";
import { HoverCard } from "@/components/ui/PageTransition";
import { StreamPlatform } from "@/hooks/useLiveStream";
import { platformConfigs } from "./constants";

interface LiveStreamPlatformSelectorProps {
  platform: StreamPlatform;
  setPlatform: (p: StreamPlatform) => void;
  isStreaming: boolean;
}

export function LiveStreamPlatformSelector({
  platform,
  setPlatform,
  isStreaming,
}: LiveStreamPlatformSelectorProps) {
  return (
    <div className="mb-6">
      <label className="text-sm font-medium mb-3 block">Pilih Platform</label>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(platformConfigs).map(([key, config]) => (
          <HoverCard key={key}>
            <Card
              isPressable
              isDisabled={isStreaming}
              onPress={() => setPlatform(key as StreamPlatform)}
              className={`border-2 transition-colors ${
                platform === key
                  ? `border-${config.color} bg-${config.color}/10`
                  : "border-transparent hover:border-divider"
              }`}
            >
              <CardBody className="p-3 text-center">
                <div
                  className={`w-10 h-10 rounded-lg bg-${config.color}/20 flex items-center justify-center mx-auto mb-1`}
                >
                  {config.icon}
                </div>
                <p className="text-xs font-medium truncate">{config.name}</p>
              </CardBody>
            </Card>
          </HoverCard>
        ))}
      </div>
    </div>
  );
}
