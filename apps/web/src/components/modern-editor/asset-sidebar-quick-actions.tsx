import { Captions, Plus, Type } from 'lucide-react';
import type { ReactNode } from 'react';
import type { VideoStudioTextAction } from '@/lib/modern-editor-quick-actions';
import { TemplatePresetCard } from './asset-sidebar-template-card';

interface QuickTextActionsProps {
  readonly isUsingFallback?: boolean;
  readonly primaryTextActions: VideoStudioTextAction[];
  readonly textTemplateActions: VideoStudioTextAction[];
  readonly onAddPlainText: (text: string) => string;
  readonly onAddStyledText: (action: VideoStudioTextAction) => void;
  readonly onAddSubtitle: (text: string) => string;
}

interface TemplateActionGridProps {
  readonly title: string;
  readonly helper?: string;
  readonly density?: 'comfortable' | 'compact';
  readonly actions: VideoStudioTextAction[];
  readonly onAdd: (action: VideoStudioTextAction) => void;
}

/**
 * One-click text and template actions for non-linear editing.
 */
export function QuickTextActions({
  isUsingFallback = false,
  primaryTextActions,
  textTemplateActions,
  onAddPlainText,
  onAddStyledText,
  onAddSubtitle,
}: QuickTextActionsProps) {
  return (
    <div className="space-y-4 pb-6">
      {isUsingFallback && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100/85">
          Katalog backend belum tersambung, memakai preset lokal sementara.
        </div>
      )}

      <div>
        <SectionHeader
          title="Text Dasar"
          helper="Mulai dari teks kosong atau subtitle bawah video."
        />
        <div className="grid grid-cols-1 gap-3">
          <QuickCreateCard
            title="Text Kosong"
            helper="Tulis bebas dari awal"
            icon={<Type size={16} />}
            preview="Aa"
            onClick={() => onAddPlainText('Text layer')}
          />
          <QuickCreateCard
            title="Subtitle"
            helper="Teks bawah video"
            icon={<Captions size={16} />}
            preview="CC"
            onClick={() => onAddSubtitle('Subtitle text...')}
          />
        </div>
      </div>

      <TemplateActionGrid
        title="Pembuka & Penutup"
        helper="Hook awal video dan ajakan aksi di akhir."
        density="compact"
        actions={primaryTextActions}
        onAdd={onAddStyledText}
      />

      <TemplateActionGrid
        title="Preset Teks Siap Pakai"
        helper="Pilih gaya teks populer, lalu edit isi dan warnanya."
        actions={textTemplateActions}
        onAdd={onAddStyledText}
      />
    </div>
  );
}

export function TemplateActionGrid({
  title,
  helper,
  density = 'comfortable',
  actions,
  onAdd,
}: TemplateActionGridProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="mb-3.5 shrink-0 space-y-2.5">
      <SectionHeader title={title} helper={helper} />
      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => (
          <TemplatePresetCard key={action.id} action={action} density={density} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ helper, title }: Readonly<{ helper?: string; title: string }>) {
  return (
    <div className="mb-2.5 px-1">
      <p className="text-xs font-black tracking-tight text-foreground">{title}</p>
      {helper && (
        <p className="mt-0.5 text-[11px] font-semibold leading-snug text-muted-foreground/80">
          {helper}
        </p>
      )}
    </div>
  );
}

function QuickCreateCard({
  helper,
  icon,
  onClick,
  preview,
  title,
}: Readonly<{
  helper: string;
  icon: ReactNode;
  onClick: () => void;
  preview: string;
  title: string;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-[120px] rounded-xl border border-border/45 bg-card/55 p-2.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card/75 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:translate-y-0 active:scale-[0.98]"
    >
      <div className="mb-2.5 flex h-16 items-center justify-center rounded-lg border border-white/10 bg-linear-to-br from-muted/30 via-primary/10 to-card">
        <div className="rounded-lg bg-black/35 px-4 py-1.5 text-xl font-black tracking-tight text-white shadow-lg">
          {preview}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-tight">{title}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground/80">{helper}</p>
        </div>
        <Plus
          size={14}
          className="text-muted-foreground transition-colors group-hover:text-primary"
        />
      </div>
    </button>
  );
}
