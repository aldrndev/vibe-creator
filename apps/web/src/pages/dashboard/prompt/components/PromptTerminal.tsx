import { useState } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { Button } from '@/components/ui';
import type { PromptVersion } from '@/hooks/use-prompts';
import { cn } from '@/lib/utils';

export interface PromptTerminalProps {
  generatedPrompt: string;
  inputData: Record<string, unknown>;
  versions?: PromptVersion[];
  currentVersionId?: string | null;
  selectedVersionId?: string | null;
  onSelectVersion?: (id: string) => void;
}

export function PromptTerminal({
  generatedPrompt,
  inputData,
  versions,
  currentVersionId,
  selectedVersionId,
  onSelectVersion,
}: Readonly<PromptTerminalProps>) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'input'>('prompt');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy =
      activeTab === 'prompt'
        ? generatedPrompt
        : JSON.stringify(inputData, null, 2);

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  const promptLines = (generatedPrompt || '').split('\n').map((text, idx) => ({
    id: `line-${idx + 1}-${text.slice(0, 10)}`,
    text,
  }));

  // Safe fallback for selected version
  const activeSelectedId = selectedVersionId ?? versions?.[0]?.id ?? '';

  return (
    <div className="relative border border-border/30 bg-card/30 backdrop-blur-xl rounded-3xl overflow-hidden shadow-inner flex flex-col flex-1 min-h-[600px]">
      {/* Editor Header with integrated Tabs */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/20 bg-muted/5 select-none shrink-0">
        <div className="flex items-center gap-6">
          {/* macOS Dots */}
          <div className="flex items-center gap-1.5 mr-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>

          {/* Version Dropdown Selector */}
          {versions && versions.length > 0 && onSelectVersion && (
            <div className="flex items-center gap-2 border-l border-border/20 pl-4">
              <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">Ver:</span>
              <div className="relative flex items-center">
                <select
                  value={activeSelectedId}
                  onChange={(e) => onSelectVersion(e.target.value)}
                  className="appearance-none bg-muted/10 border border-border/40 hover:border-border/60 rounded-xl text-[10px] font-black uppercase tracking-wider text-foreground pr-8 pl-3 py-1.5 focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all duration-200"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id} className="bg-card text-foreground py-2 font-medium">
                      Versi {v.version} {v.id === currentVersionId ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 text-muted-foreground pointer-events-none stroke-[2.5]" />
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-4 border-l border-border/20 pl-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('prompt');
                setCopied(false);
              }}
              className={cn(
                'text-[9px] font-black tracking-widest uppercase pb-1.5 pt-1 border-b-2 transition-all cursor-pointer outline-none',
                activeTab === 'prompt'
                  ? 'border-primary text-primary font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground font-bold',
              )}
            >
              Generated Prompt
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('input');
                setCopied(false);
              }}
              className={cn(
                'text-[9px] font-black tracking-widest uppercase pb-1.5 pt-1 border-b-2 transition-all cursor-pointer outline-none',
                activeTab === 'input'
                  ? 'border-primary text-primary font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground font-bold',
              )}
            >
              Input Data
            </button>
          </div>
        </div>

        {/* Copy Action Button */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className={cn(
              'h-8 px-3.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all active:scale-95 flex items-center gap-1.5 shrink-0 border-none bg-linear-to-r from-primary via-orange-500 to-rose-600 text-white shadow-md shadow-primary/10 hover:brightness-110 cursor-pointer',
              copied && 'from-green-500 via-emerald-500 to-teal-600 shadow-green-500/10',
            )}
            onClick={handleCopy}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Disalin!' : 'Salin Semua'}
          </Button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-auto bg-card/5 flex flex-col">
        {activeTab === 'prompt' ? (
          <div className="p-6 select-all flex flex-col gap-1.5">
            {promptLines.map((lineObj, idx) => {
              const trimmed = lineObj.text.trim();
              let lineClass = 'text-foreground/90 font-sans font-normal text-[12px]';
              if (trimmed.startsWith('###') || trimmed.startsWith('***')) {
                lineClass = 'text-primary font-sans font-bold text-[12px]';
              } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                lineClass =
                  'text-foreground/90 font-sans font-normal text-[12px] pl-2 border-l border-primary/20';
              } else if (trimmed.startsWith('```')) {
                lineClass = 'text-emerald-500/85 font-mono text-[12px] bg-muted/5 px-1 rounded-sm';
              }
              return (
                <div key={lineObj.id} className="flex items-start group leading-relaxed">
                  {/* Line Number */}
                  <div className="text-right text-muted-foreground/30 font-mono text-[11px] select-none pr-4 border-r border-border/10 min-w-[32px] shrink-0 pt-0.5">
                    {idx + 1}
                  </div>
                  {/* Line Text */}
                  <div className={cn('pl-4 flex-1 whitespace-pre-wrap', lineClass)}>
                    {lineObj.text || '\u00A0'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 select-all flex-1 flex flex-col">
            <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground p-6 rounded-2xl bg-black/40 border border-border/10 shadow-inner flex-1 overflow-auto">
              {JSON.stringify(inputData || {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
