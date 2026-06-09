import type React from 'react';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@/components/ui';

export interface EditTitleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSave: (newTitle: string) => Promise<void>;
  isPending: boolean;
}

export function EditTitleDialog({
  isOpen,
  onOpenChange,
  title,
  onSave,
  isPending,
}: Readonly<EditTitleDialogProps>) {
  const [newTitle, setNewTitle] = useState(title);

  useEffect(() => {
    if (isOpen) {
      setNewTitle(title);
    }
  }, [isOpen, title]);

  const handleSave = () => {
    onSave(newTitle);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-border/50 bg-card/95 backdrop-blur-2xl p-0 overflow-hidden sm:max-w-[400px]">
        <DialogHeader className="p-6 bg-muted/10 border-b border-border/30">
          <DialogTitle className="text-lg font-black uppercase tracking-widest text-foreground">
            Edit Judul Prompt
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Nama Prompt Baru
            </div>
            <Input
              placeholder="Masukkan judul baru"
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
              className="h-12 rounded-xl bg-muted/20 border-border/50 font-bold px-4"
            />
          </div>
        </div>
        <DialogFooter className="p-6 bg-muted/5 border-t border-border/30 flex-row gap-3">
          <Button
            variant="ghost"
            className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            className="flex-2 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-primary/20 cursor-pointer"
            onClick={handleSave}
            isLoading={isPending}
          >
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
