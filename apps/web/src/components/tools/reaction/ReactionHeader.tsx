import { Layers } from 'lucide-react';

export function ReactionHeader() {
  return (
    <div className="flex flex-col gap-2 mb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
          <Layers className="text-white w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-rose-600">
          Reaction Creator
        </h1>
      </div>
      <p className="text-muted-foreground font-medium text-sm ml-13">
        Buat video reaction atau tempel (side-by-side) dengan mudah dan cepat.
      </p>
    </div>
  );
}
