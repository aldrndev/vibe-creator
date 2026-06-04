import { Repeat2 } from 'lucide-react';
import { Input } from '@/components/ui';

interface LoopHeaderProps {
  readonly title: string;
  readonly onTitleChange: (title: string) => void;
  readonly isSaving: boolean;
  readonly hasProject: boolean;
}

export function LoopHeader({ title, onTitleChange, isSaving, hasProject }: LoopHeaderProps) {
  return (
    <header className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Repeat2 size={23} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Loop Creator</h1>
        </div>
        <p className="max-w-xl text-sm font-medium text-muted-foreground">
          Perpanjang satu video siap pakai menjadi video loop panjang yang halus.
        </p>
      </div>
      {hasProject ? (
        <div className="w-full space-y-1 md:w-72">
          <label
            className="text-[11px] font-black uppercase text-muted-foreground"
            htmlFor="loop-title"
          >
            Nama project
          </label>
          <Input
            id="loop-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="h-11 rounded-xl"
          />
          <p className="text-right text-[11px] font-semibold text-muted-foreground">
            {isSaving ? 'Menyimpan...' : 'Auto-saved'}
          </p>
        </div>
      ) : null}
    </header>
  );
}
