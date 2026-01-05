import { useState } from "react";
import { Button, Card, CardBody, Tabs, Tab } from "@heroui/react";
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
      // Button text changes to "Disalin!" - no additional feedback needed
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="lg:sticky lg:top-6 lg:self-start"
    >
      <Card className="h-[calc(100vh-12rem)] overflow-hidden">
        <CardBody className="p-0 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-divider">
            <h3 className="font-medium">Hasil Prompt</h3>
            {generatedPrompt && (
              <Button
                size="sm"
                variant="flat"
                startContent={copied ? <Check size={16} /> : <Copy size={16} />}
                onPress={handleCopy}
              >
                {copied ? "Disalin!" : "Salin Semua"}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {generatedPrompt ? (
              (() => {
                // Smart Parsing Logic
                const parts = generatedPrompt.split(/(?=###)/g);
                const hasSections =
                  parts.length > 1 &&
                  parts.some((p) => p.trim().startsWith("###"));

                if (!hasSections) {
                  return (
                    <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/80 font-sans">
                      {generatedPrompt}
                    </pre>
                  );
                }

                // Extract Intro (before first ###) and Sections
                const intro =
                  parts.find((p) => !p.trim().startsWith("###")) || "";
                const sections = parts
                  .filter((p) => p.trim().startsWith("###"))
                  .map((section) => {
                    const lines = section.trim().split("\n");
                    const title = (lines[0] || "")
                      .replace(/^###\s*/, "")
                      .replace(/:.*$/, "")
                      .trim(); // Remove ### and optional subtitle
                    const content = lines.slice(1).join("\n").trim();
                    return { title, content, raw: section };
                  });

                return (
                  <div className="space-y-4">
                    {intro && (
                      <div className="text-sm text-foreground/70 bg-content2 p-3 rounded-lg whitespace-pre-wrap">
                        {intro.trim()}
                      </div>
                    )}

                    <Tabs
                      aria-label="Prompt Options"
                      color="primary"
                      variant="underlined"
                    >
                      {sections.map((section, idx) => (
                        <Tab key={idx} title={section.title}>
                          <div className="relative mt-2">
                            <Card className="bg-content2/50 border border-divider/50 shadow-none">
                              <CardBody className="p-3">
                                <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans">
                                  {section.content}
                                </pre>
                              </CardBody>
                            </Card>
                            <Button
                              size="sm"
                              isIconOnly
                              variant="light"
                              className="absolute top-2 right-2 opacity-50 hover:opacity-100"
                              onPress={() => {
                                navigator.clipboard.writeText(section.content);
                                // Visual feedback: button opacity change is sufficient
                              }}
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </Tab>
                      ))}
                    </Tabs>
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex items-center justify-center text-foreground/40">
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
