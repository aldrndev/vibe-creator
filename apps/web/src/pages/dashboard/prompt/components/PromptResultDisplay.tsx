import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Sparkles, Terminal } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, CardBody, Divider, Tab, Tabs, TabsContent, TabsList } from '@/components/ui';

interface PromptResultDisplayProps {
  generatedPrompt: string | null;
}

export function PromptResultDisplay({ generatedPrompt }: PromptResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (generatedPrompt) {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const parsePrompt = () => {
    if (!generatedPrompt) return null;

    const parts = generatedPrompt.split(/(?=###)/g);
    const hasSections = parts.length > 1 && parts.some((p) => p.trim().startsWith('###'));

    if (!hasSections) {
      return { type: 'plain' as const, content: generatedPrompt };
    }

    const intro = parts.find((p) => !p.trim().startsWith('###')) || '';
    const sections = parts
      .filter((p) => p.trim().startsWith('###'))
      .map((section) => {
        const lines = section.trim().split('\n');
        const title = (lines[0] || '')
          .replace(/^###\s*/, '')
          .replace(/:.*$/, '')
          .trim();
        const content = lines.slice(1).join('\n').trim();
        return { title, content, raw: section };
      });

    return { type: 'sections' as const, intro, sections };
  };

  const parsed = parsePrompt();

  return (
    <div className="h-full">
      <Card className="bg-card/70 backdrop-blur-xl border-border/50 h-[calc(100vh-14rem)] min-h-[500px] overflow-hidden flex flex-col group/result">
        {/* Card Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Terminal size={16} className="text-primary" />
            </div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-foreground/80">
              Hasil Arsitektur Prompt
            </h3>
          </div>
          <AnimatePresence>
            {generatedPrompt && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopy}
                  className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-white border-none transition-all active:scale-95"
                >
                  {copied ? (
                    <Check size={14} className="mr-2" />
                  ) : (
                    <Copy size={14} className="mr-2" />
                  )}
                  {copied ? 'Disalin!' : 'Salin Semua'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            {parsed ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {parsed.type === 'plain' ? (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <pre className="relative whitespace-pre-wrap text-sm font-medium text-foreground/90 font-sans leading-relaxed bg-muted/20 p-6 rounded-3xl border border-border/50">
                      {parsed.content}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {parsed.intro && (
                      <div className="text-xs font-bold text-muted-foreground bg-muted/20 p-5 rounded-2xl border border-border/40 leading-relaxed italic">
                        {parsed.intro.trim()}
                      </div>
                    )}

                    <Tabs defaultValue={parsed.sections[0]?.title || '0'} className="w-full">
                      <TabsList className="w-full justify-start border-b border-border/50 bg-transparent mb-6 overflow-x-auto scrollbar-hide py-1">
                        {parsed.sections.map((section, idx) => (
                          <Tab
                            key={section.title || section.content}
                            value={section.title || String(idx)}
                            className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary transition-all px-6 font-black uppercase tracking-widest text-[9px]"
                          >
                            {section.title}
                          </Tab>
                        ))}
                      </TabsList>

                      {parsed.sections.map((section, idx) => (
                        <TabsContent
                          key={section.title || section.content}
                          value={section.title || String(idx)}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative group"
                          >
                            <div className="absolute inset-x-0 -bottom-4 h-24 bg-gradient-to-t from-primary/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                            <Card className="bg-muted/30 border border-border/40 shadow-none rounded-3xl overflow-hidden">
                              <CardBody className="p-8">
                                <pre className="whitespace-pre-wrap text-[13px] font-bold text-foreground/90 font-sans leading-relaxed">
                                  {section.content}
                                </pre>
                              </CardBody>
                            </Card>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="absolute top-4 right-4 h-10 w-10 rounded-xl bg-background/50 backdrop-blur-md border border-border/50 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                              onClick={() => {
                                navigator.clipboard.writeText(section.content);
                              }}
                            >
                              <Copy size={16} className="text-primary" />
                            </Button>
                          </motion.div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center text-muted-foreground"
              >
                <div className="text-center space-y-6">
                  <div className="relative inline-flex">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-20" />
                    <div className="relative w-24 h-24 rounded-[2rem] bg-muted/20 flex items-center justify-center border border-border/50">
                      <Sparkles size={40} className="text-primary/40" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-tighter mb-2">
                      Architecting Logic
                    </h4>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-60">
                      Hasil rancangan prompt akan muncul di sini
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Divider className="w-8 opacity-20" />
                      <span className="text-[9px] font-black tracking-[0.2em] opacity-30">
                        VIBE CREATOR
                      </span>
                      <Divider className="w-8 opacity-20" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
