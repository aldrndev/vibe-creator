import {
  EDITOR_FONT_CATEGORY_LABELS,
  type EditorFontFamily,
  resolveEditorFont,
  resolveEditorFontFamily,
} from '@vibe-creator/shared';
import { Check, ChevronDown, Search, Type } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { getEditorFontPreviewFamily } from '@/lib/editor-font-loader';
import { getEditorFontSelectGroups } from '@/lib/editor-font-select-options';
import { cn } from '@/lib/utils';

interface EditorFontSelectProps {
  readonly align?: 'start' | 'center' | 'end';
  readonly className?: string;
  readonly contentClassName?: string;
  readonly onChange: (fontFamily: EditorFontFamily) => void;
  readonly placeholder?: string;
  readonly value?: string | null;
}

export function EditorFontSelect({
  align = 'start',
  className,
  contentClassName,
  onChange,
  placeholder = 'Pilih font',
  value,
}: Readonly<EditorFontSelectProps>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedFamily = resolveEditorFontFamily(value);
  const selectedFont = resolveEditorFont(selectedFamily);
  const selectedCategoryLabel = EDITOR_FONT_CATEGORY_LABELS[selectedFont.category];
  const groups = useMemo(() => getEditorFontSelectGroups(query), [query]);

  const handleSelect = (fontFamily: EditorFontFamily) => {
    onChange(fontFamily);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-11 w-full justify-between rounded-xl border border-border/35 bg-background/30 px-3 text-left hover:border-primary/45 hover:bg-primary/5',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-base font-black text-primary"
              style={{ fontFamily: getEditorFontPreviewFamily(selectedFamily) }}
            >
              Aa
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-foreground">
                {selectedFont.label || placeholder}
              </span>
              <span className="block truncate text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                {selectedCategoryLabel}
              </span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-[18rem] overflow-hidden p-2',
          contentClassName,
        )}
      >
        <div className="space-y-2">
          <Input
            type="search"
            value={query}
            placeholder="Cari font..."
            leftIcon={<Search size={15} />}
            className="h-10 rounded-xl bg-background/40 text-sm"
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="max-h-72 overflow-y-auto pr-1">
            {groups.length === 0 ? (
              <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-background/20 px-4 text-center">
                <Type size={18} className="text-muted-foreground/60" />
                <p className="mt-2 text-xs font-bold text-muted-foreground">
                  Font tidak ditemukan.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group, groupIndex) => (
                  <div
                    key={group.category}
                    className={cn(groupIndex > 0 && 'border-t border-border/35 pt-2')}
                  >
                    <div className="px-2 pb-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.fonts.map((font) => {
                        const active = selectedFamily === font.family;

                        return (
                          <button
                            key={font.id}
                            type="button"
                            className={cn(
                              'flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all active:scale-[0.99]',
                              active
                                ? 'border border-primary/30 bg-primary/10 text-primary'
                                : 'border border-transparent text-muted-foreground hover:border-primary/20 hover:bg-primary/5 hover:text-foreground',
                            )}
                            onClick={() => handleSelect(font.family as EditorFontFamily)}
                          >
                            <span
                              className={cn(
                                'flex h-8 w-10 shrink-0 items-center justify-center rounded-lg border text-base font-black',
                                active
                                  ? 'border-primary/30 bg-primary/15 text-primary'
                                  : 'border-border/35 bg-background/35 text-foreground',
                              )}
                              style={{ fontFamily: getEditorFontPreviewFamily(font.family) }}
                            >
                              Aa
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className="block truncate text-sm font-black"
                                style={{ fontFamily: getEditorFontPreviewFamily(font.family) }}
                              >
                                {font.label}
                              </span>
                              <span className="block truncate text-[10px] font-semibold text-muted-foreground/70">
                                {group.label}
                              </span>
                            </span>
                            {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
