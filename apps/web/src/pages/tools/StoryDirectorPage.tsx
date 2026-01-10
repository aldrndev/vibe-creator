import { Button } from "@/components/ui";
import { LayoutTemplate, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useStoryStore } from "@/stores/story-store";
import { StoryBoard } from "./story-director/StoryBoard";
import { DirectorPanel } from "./story-director/DirectorPanel";
import { useParams } from "react-router-dom";

export function StoryDirectorPage() {
  const { initStory, loadStory, currentStory } = useStoryStore();
  const { projectId } = useParams();

  useEffect(() => {
    if (projectId) {
      if (currentStory?.projectId !== projectId) {
        loadStory(projectId);
      }
    } else if (!currentStory) {
      initStory(crypto.randomUUID());
    }
  }, [projectId, initStory, loadStory, currentStory]);

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-card/50 p-4 rounded-xl border border-border/50 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles size={24} className="text-primary" />
            AI Story Director
          </h1>
          <p className="text-muted-foreground text-sm">
            Scene-Based Video Creator. You direct the vibe, AI handles the
            edits.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <LayoutTemplate size={18} />
            Templates
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        <StoryBoard />
        <DirectorPanel />
      </div>
    </div>
  );
}
