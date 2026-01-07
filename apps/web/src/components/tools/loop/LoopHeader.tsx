import { Repeat } from "lucide-react";

export function LoopHeader() {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Repeat size={24} className="text-primary" />
          Loop Creator
        </h1>
        <p className="text-foreground/60 text-sm">
          Buat video loop, boomerang, atau GIF
        </p>
      </div>
    </div>
  );
}
