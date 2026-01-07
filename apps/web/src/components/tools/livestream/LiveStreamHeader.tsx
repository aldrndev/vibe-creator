import { Button, Chip } from "@heroui/react";
import { ArrowLeft, Radio, Wifi } from "lucide-react";
import { Link } from "react-router-dom";

interface LiveStreamHeaderProps {
  isStreaming: boolean;
}

export function LiveStreamHeader({ isStreaming }: LiveStreamHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Button
        as={Link}
        to="/tools/live-stream-history"
        isIconOnly
        variant="light"
        size="sm"
      >
        <ArrowLeft size={20} />
      </Button>

      <div className="flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio size={24} className="text-danger" />
          Live Streaming
        </h1>
        <p className="text-foreground/60 text-sm">
          Stream video ke platform favorit
        </p>
      </div>

      {isStreaming && (
        <div>
          <Chip
            color="danger"
            variant="solid"
            className="animate-pulse"
            startContent={<Wifi size={14} />}
          >
            LIVE
          </Chip>
        </div>
      )}
    </div>
  );
}
