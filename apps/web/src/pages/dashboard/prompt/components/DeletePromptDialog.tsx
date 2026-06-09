import { Trash2 } from 'lucide-react';
import { Button, Dialog, DialogContent } from '@/components/ui';

export interface DeletePromptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isPending: boolean;
}

export function DeletePromptDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
}: Readonly<DeletePromptDialogProps>) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border border-border/50 bg-card/90 backdrop-blur-2xl p-8 overflow-hidden sm:max-w-[420px] shadow-2xl shadow-black/80 flex flex-col items-center text-center gap-6">
        {/* Aesthetic Glowing Trash/Warning Icon */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-lg shadow-rose-500/5 animate-pulse">
          <Trash2 size={28} className="stroke-[1.75]" />
          <div className="absolute inset-0 rounded-2xl bg-rose-500/5 blur-md pointer-events-none" />
        </div>

        {/* Text Information */}
        <div className="space-y-2.5">
          <h2 className="text-lg font-black tracking-tight text-foreground uppercase">
            Hapus Prompt?
          </h2>
          <p className="text-muted-foreground font-medium text-xs leading-relaxed max-w-[320px] mx-auto">
            Apakah Anda yakin ingin menghapus prompt ini? Tindakan ini bersifat permanen, tidak
            dapat dibatalkan, dan seluruh riwayat versi akan terhapus selamanya.
          </p>
        </div>

        {/* Actions Button Bar */}
        <div className="flex w-full gap-3 mt-2 shrink-0">
          <Button
            variant="ghost"
            className="flex-1 rounded-xl h-11 uppercase text-[10px] font-black tracking-wider border border-border/50 bg-muted/5 hover:bg-muted/10 transition-all cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            className="flex-1 rounded-xl h-11 uppercase text-[10px] font-black tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/10 transition-all cursor-pointer"
            onClick={onConfirm}
            isLoading={isPending}
          >
            Hapus Sekarang
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
