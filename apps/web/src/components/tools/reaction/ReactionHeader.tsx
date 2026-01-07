import { Layers } from "lucide-react";

export function ReactionHeader() {
  return (
    <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Layers size={24} className="text-primary" />
          Reaction Creator
        </h1>
        <p className="text-foreground/60 text-sm">
          Buat video reaction atau tempel dengan mudah
        </p>
      </div>
    </div>
  );
}
