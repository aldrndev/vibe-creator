import { Link } from '@tanstack/react-router';
import { ArrowLeft, Radio } from 'lucide-react';
import { Badge, Button } from '@/components/ui';

interface LiveStreamHeaderProps {
  isStreaming: boolean;
}

export function LiveStreamHeader({ isStreaming }: Readonly<LiveStreamHeaderProps>) {
  return (
    <div className="mb-8 flex flex-col gap-3">
      <Button
        asChild
        variant="ghost"
        className="h-9 w-fit gap-2 rounded-full border border-border/50 bg-muted/20 px-3 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <Link to="/tools/live-stream-history">
          <ArrowLeft size={15} />
          Riwayat Stream
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
            <Radio className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
            Live Streamer
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming && (
            <Badge className="bg-rose-500 hover:bg-rose-500 text-white border-rose-400/30 animate-pulse px-3 py-1 rounded-full text-[10px] font-black tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-white mr-2" /> LIVE
            </Badge>
          )}
        </div>
      </div>
      <p className="text-muted-foreground font-medium text-sm">
        Loop video kamu ke berbagai platform tanpa PC menyala.
      </p>
    </div>
  );
}
