import { Button, Badge } from "@/components/ui";
import { ArrowLeft, Radio, Wifi } from "lucide-react";
import { Link } from "react-router-dom";

interface LiveStreamHeaderProps {
  isStreaming: boolean;
}

export function LiveStreamHeader({ isStreaming }: LiveStreamHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Button asChild variant="ghost" size="icon">
        <Link to="/tools/live-stream-history">
          <ArrowLeft size={20} />
        </Link>
      </Button>

      <div className="flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio size={24} className="text-destructive" />
          Live Streaming
        </h1>
        <p className="text-muted-foreground text-sm">
          Stream video ke platform favorit
        </p>
      </div>

      {isStreaming && (
        <div>
          <Badge variant="destructive" className="animate-pulse">
            <Wifi size={14} className="mr-1" />
            LIVE
          </Badge>
        </div>
      )}
    </div>
  );
}
