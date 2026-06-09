import type { PromptType } from '@vibe-creator/shared';
import { Check } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { cn } from '@/lib/utils';
import { promptTypes } from '../constants';

interface PromptTypeSelectorProps {
  selectedType: PromptType;
  onSelect: (type: PromptType) => void;
}

export function PromptTypeSelector({ selectedType, onSelect }: PromptTypeSelectorProps) {
  return (
    <Card className="bg-card/70 border-border/50">
      <CardBody className="p-6 space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Pilih Kategori
          </h3>
          <p className="text-sm font-bold text-foreground/80 ml-1">
            Tentukan jenis konten yang ingin dirancang
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {promptTypes.map((type) => {
            const Icon = type.icon;
            const isActive = selectedType === type.key;

            return (
              <button
                type="button"
                key={type.key}
                onClick={() => onSelect(type.key as PromptType)}
                className={cn(
                  'relative p-4 rounded-2xl border text-left transition-all duration-300 group overflow-hidden active:scale-95',
                  isActive
                    ? 'bg-primary/8 border-primary'
                    : 'bg-muted/10 border-border/50 hover:border-primary/30 hover:bg-muted/20',
                )}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute top-3 right-3 text-primary animate-in fade-in zoom-in-50 duration-200">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}

                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-muted/20 text-primary group-hover:bg-primary/20',
                  )}
                >
                  <Icon size={20} />
                </div>

                <h4 className="font-black text-[11px] uppercase tracking-wider mb-1">
                  {type.label}
                </h4>
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed line-clamp-2">
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
