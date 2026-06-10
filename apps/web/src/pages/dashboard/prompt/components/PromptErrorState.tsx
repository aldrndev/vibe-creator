import { Trash } from 'lucide-react';
import { Button } from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';

export interface PromptErrorStateProps {
  onBack: () => void;
}

export function PromptErrorState({ onBack }: Readonly<PromptErrorStateProps>) {
  return (
    <PageTransition className="text-center py-20">
      <div className="max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto">
          <Trash className="text-muted-foreground w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-widest text-foreground">
            Prompt Tidak Ditemukan
          </h2>
          <p className="text-muted-foreground font-medium text-sm">
            Prompt mungkin telah dihapus atau tidak tersedia.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-full px-8 border-border/50 font-black uppercase text-[10px] tracking-widest h-11 cursor-pointer"
        >
          Kembali ke Prompts
        </Button>
      </div>
    </PageTransition>
  );
}
