import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Tabs,
  TabsList,
  Tab,
  TabsContent,
} from "@/components/ui";
import { Copy, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface PromptResultDisplayProps {
  generatedPrompt: string | null;
}

export function PromptResultDisplay({
  generatedPrompt,
}: PromptResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (generatedPrompt) {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Smart Parsing Logic
  const parsePrompt = () => {
    if (!generatedPrompt) return null;

    const parts = generatedPrompt.split(/(?=###)/g);
    const hasSections =
      parts.length > 1 && parts.some((p) => p.trim().startsWith("###"));

    if (!hasSections) {
      return { type: "plain" as const, content: generatedPrompt };
    }

    const intro = parts.find((p) => !p.trim().startsWith("###")) || "";
    const sections = parts
      .filter((p) => p.trim().startsWith("###"))
      .map((section) => {
        const lines = section.trim().split("\n");
        const title = (lines[0] || "")
          .replace(/^###\s*/, "")
          .replace(/:.*$/, "")
          .trim();
        const content = lines.slice(1).join("\n").trim();
        return { title, content, raw: section };
      });

    return { type: "sections" as const, intro, sections };
  };

  const parsed = parsePrompt();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="lg:sticky lg:top-6 lg:self-start"
    >
      <Card className="h-[calc(100vh-12rem)] overflow-hidden">
        <CardBody className="p-0 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-medium">Hasil Prompt</h3>
            {generatedPrompt && (
              <Button size="sm" variant="secondary" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Disalin!" : "Salin Semua"}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {parsed ? (
              parsed.type === "plain" ? (
                <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground font-sans">
                  {parsed.content}
                </pre>
              ) : (
                <div className="space-y-4">
                  {parsed.intro && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg whitespace-pre-wrap">
                      {parsed.intro.trim()}
                    </div>
                  )}

                  <Tabs
                    defaultValue={parsed.sections[0]?.title || "0"}
                    className="w-full"
                  >
                    <TabsList className="w-full justify-start border-b border-border bg-transparent">
                      {parsed.sections.map((section, idx) => (
                        <Tab
                          key={idx}
                          value={section.title || String(idx)}
                          className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
                          {section.title}
                        </Tab>
                      ))}
                    </TabsList>

                    {parsed.sections.map((section, idx) => (
                      <TabsContent
                        key={idx}
                        value={section.title || String(idx)}
                      >
                        <div className="relative mt-2">
                          <Card className="bg-muted/50 border border-border/50 shadow-none">
                            <CardBody className="p-3">
                              <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans">
                                {section.content}
                              </pre>
                            </CardBody>
                          </Card>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 opacity-50 hover:opacity-100"
                            onClick={() => {
                              navigator.clipboard.writeText(section.content);
                            }}
                          >
                            <Copy size={14} />
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Hasil prompt akan muncul di sini</p>
                  <p className="text-sm mt-1">Isi form dan klik Generate</p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
