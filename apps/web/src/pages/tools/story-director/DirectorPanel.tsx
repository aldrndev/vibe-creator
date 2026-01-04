import {
  Card,
  Button,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { useMemo } from "react";
import { Wand2, Music, Layers, AlertTriangle, Loader2 } from "lucide-react";
import { useStoryStore } from "@/stores/story-store";
import { useNavigate } from "react-router-dom";
import { useEditorStore } from "@/stores/editor-store";
import { toast } from "react-hot-toast";

import { PreviewPlayer } from "./PreviewPlayer";
import { compileStoryToTimeline } from "@/utils/story-compiler";
import { useJobPolling } from "@/hooks/use-job-polling";
import { api } from "@/services/api";

export function DirectorPanel() {
  const {
    currentStory,
    forkToTimeline,
    updateGlobalVibe,
    applyAiGeneratedStory,
  } = useStoryStore();
  const { initProject } = useEditorStore();
  const navigate = useNavigate();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Async Job Polling for AI Generation
  const { startJob, isPolling } = useJobPolling(null, {
    pollInterval: 2000,
    onComplete: (data) => {
      toast.success("Story Generated Successfully!");
      applyAiGeneratedStory(data);
    },
    onError: (err) => {
      toast.error("Generation Failed: " + err);
    },
  });

  const handleAiGenerate = async () => {
    try {
      toast("Starting AI Generation...", { icon: "✨" });
      const res = await api.post<{ jobId: string }>(
        "/jobs/story/generate-structure",
        {
          prompt: "Cyberpunk city chase", // Hardcoded for now, or add input
          projectId: currentStory?.projectId,
        }
      );

      if (res.success && res.data) {
        startJob(res.data.jobId);
      } else {
        toast.error("Failed to start job");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  // Reactive compilation for Live Preview
  const previewTimeline = useMemo(() => {
    if (!currentStory) return null;
    return compileStoryToTimeline(currentStory);
  }, [currentStory]);

  const handleCompileConfirm = async () => {
    toast.success("Compiling Story to Timeline...");

    try {
      // 1. Fork Storage (Lock Story Mode and Save Version)
      await forkToTimeline(previewTimeline);

      if (currentStory && previewTimeline) {
        // 2. Init Project in Editor Store (Client check)
        initProject(currentStory.projectId, "Story Project (Forked)");

        // 3. Load Compiled Timeline (Client check)
        useEditorStore.getState().loadTimeline(previewTimeline);

        // 4. Navigate to the SPECIFIC project ID
        // This ensures that if the Editor eventually supports persistence, it loads the right project.
        navigate(`/editor/${currentStory.projectId}`);
      }
    } catch (error) {
      console.error("Fork failed:", error);
      toast.error("Failed to fork project");
    }
  };

  if (!currentStory) return null;

  return (
    <>
      <div className="w-80 hidden lg:flex flex-col gap-4">
        {/* Live Preview */}
        <div className="sticky top-4 z-10">
          {previewTimeline && <PreviewPlayer timeline={previewTimeline} />}
        </div>

        {/* Global Controls */}
        <Card className="flex-1 bg-content1 border border-divider p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Layers size={18} />
            Global Vibe
          </h3>

          <div className="flex flex-col gap-4">
            <Select
              label="Tempo / Pace"
              size="sm"
              selectedKeys={[currentStory.globalVibe.tempo]}
              onChange={(e) =>
                updateGlobalVibe({
                  tempo: e.target.value as "slow" | "medium" | "fast",
                })
              }
            >
              <SelectItem key="slow" textValue="Slow & Relaxed">
                Slow & Relaxed
              </SelectItem>
              <SelectItem key="medium" textValue="Medium / Standard">
                Medium / Standard
              </SelectItem>
              <SelectItem key="fast" textValue="Fast & Energetic">
                Fast & Energetic
              </SelectItem>
            </Select>

            <Button
              size="sm"
              variant="flat"
              className="justify-start"
              onPress={handleAiGenerate}
              isDisabled={isPolling}
            >
              {isPolling ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Wand2 size={16} className="mr-2" />
              )}
              {isPolling ? "Dreaming..." : "Remix Story Structure"}
            </Button>

            <Button size="sm" variant="flat" className="justify-start">
              <Music size={16} className="mr-2" /> Auto-Sync Music
            </Button>

            <div className="my-2 border-t border-divider" />

            <Button
              color="primary"
              className="w-full font-semibold"
              onPress={onOpen}
            >
              Open in Advanced Editor
            </Button>
            <p className="text-xs text-foreground/50 text-center px-2">
              Warning: Editing in advanced mode will disconnect from Story
              Director.
            </p>
          </div>
        </Card>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Switch to Advanced Editor?
              </ModalHeader>
              <ModalBody>
                <div className="flex items-center gap-4 p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <AlertTriangle className="text-warning shrink-0" size={24} />
                  <div className="text-sm">
                    <p className="font-bold text-warning">Point of No Return</p>
                    <p>
                      Story Mode features (AI vibes, scene reordering) will be
                      disabled for this project version.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-foreground/80">
                  You are about to fork this story into a standard timeline. Any
                  further changes here will not reflect in Story Mode.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    handleCompileConfirm();
                    onClose();
                  }}
                >
                  Confirm & Open Editor
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
