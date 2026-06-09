import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionOption {
  key: string;
  label: string;
}

interface SelectionGridProps {
  options: SelectionOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: number;
  label?: string;
  required?: boolean;
  error?: boolean;
}

/**
 * Rich selection grid component - replaces text inputs with clickable cards
 */
export function SelectionGrid({
  options,
  value,
  onChange,
  columns = 4,
  label,
  required,
  error,
}: SelectionGridProps) {
  return (
    <div className="space-y-3">
      {label && (
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          {label} {required && <span className="text-rose-500 font-black ml-0.5">*</span>}
        </div>
      )}
      <div
        className={cn(
          'grid gap-2',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-2 sm:grid-cols-3',
          columns === 4 && 'grid-cols-2 sm:grid-cols-4',
          columns === 5 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
        )}
      >
        {options.map((opt) => {
          const isSelected = value === opt.key;
          return (
            <button
              type="button"
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={cn(
                'relative px-3 py-4 rounded-xl border transition-all duration-300 active:scale-95 text-center flex flex-col items-center justify-center gap-1 group',
                isSelected && 'bg-primary/8 border-primary shadow-lg shadow-primary/5',
                !isSelected &&
                  error &&
                  'bg-rose-500/3 border-rose-500/55 hover:border-rose-500 hover:bg-rose-500/5',
                !isSelected &&
                  !error &&
                  'bg-muted/10 border-border/50 hover:border-primary/30 hover:bg-muted/20',
              )}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 text-primary animate-in fade-in zoom-in-50 duration-200">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
              <p
                className={cn(
                  'text-xs font-black uppercase tracking-tight transition-colors',
                  isSelected ? 'text-primary' : 'text-foreground/80 group-hover:text-primary/80',
                )}
              >
                {opt.label.split(' / ')[0]}
              </p>
              {opt.label.includes(' / ') && (
                <p className="text-[10px] font-medium text-muted-foreground leading-tight line-clamp-1">
                  {opt.label.split(' / ')[1]}
                </p>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <div className="text-rose-500 text-[10px] font-bold mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
          * Pilihan ini wajib ditentukan
        </div>
      )}
    </div>
  );
}

interface MultiSelectGridProps {
  options: SelectionOption[];
  values: string[];
  onChange: (values: string[]) => void;
  columns?: number;
  label?: string;
  maxSelections?: number;
  required?: boolean;
  error?: boolean;
}

/**
 * Multi-select grid for selecting multiple options
 */
export function MultiSelectGrid({
  options,
  values,
  onChange,
  columns = 4,
  label,
  maxSelections = 5,
  required,
  error,
}: MultiSelectGridProps) {
  const handleToggle = (key: string) => {
    if (values.includes(key)) {
      onChange(values.filter((v) => v !== key));
    } else if (values.length < maxSelections) {
      onChange([...values, key]);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between ml-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {label} {required && <span className="text-rose-500 font-black ml-0.5">*</span>}
          </div>
          {maxSelections > 1 && (
            <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">
              Max {maxSelections}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'grid gap-2',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-2 sm:grid-cols-3',
          columns === 4 && 'grid-cols-2 sm:grid-cols-4',
          columns === 5 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
        )}
      >
        {options.map((opt) => {
          const isSelected = values.includes(opt.key);
          return (
            <button
              type="button"
              key={opt.key}
              onClick={() => handleToggle(opt.key)}
              className={cn(
                'relative px-4 py-4 rounded-xl border transition-all duration-300 active:scale-95 text-center flex flex-col items-center justify-center gap-1 group',
                isSelected && 'bg-primary/8 border-primary shadow-lg shadow-primary/5',
                !isSelected &&
                  error &&
                  'bg-rose-500/3 border-rose-500/55 hover:border-rose-500 hover:bg-rose-500/5',
                !isSelected &&
                  !error &&
                  'bg-muted/10 border-border/50 hover:border-primary/30 hover:bg-muted/20',
              )}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 text-primary animate-in fade-in zoom-in-50 duration-200">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
              <p
                className={cn(
                  'text-xs font-black uppercase tracking-tight transition-colors',
                  isSelected ? 'text-primary' : 'text-foreground/80 group-hover:text-primary/80',
                )}
              >
                {opt.label.split(' / ')[0]}
              </p>
              {opt.label.includes(' / ') && (
                <p className="text-[10px] font-medium text-muted-foreground leading-tight line-clamp-1">
                  {opt.label.split(' / ')[1]}
                </p>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <div className="text-rose-500 text-[10px] font-bold mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
          * Pilihan ini wajib ditentukan
        </div>
      )}
    </div>
  );
}
