import { AlertTriangle, Layers, Loader2, Music, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { useJobPolling } from '@/hooks/use-job-polling';
import { api } from '@/services/api';
import { useEditorStore } from '@/stores/editor-store';
import { useStoryStore } from '@/stores/story-store';
import { compileStoryToTimeline } from '@/utils/story-compiler';
import { PreviewPlayer } from './PreviewPlayer';

interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

export function DirectorPanel() {
  const { currentStory, forkToTimeline, updateGlobalVibe, applyAiGeneratedStory } = useStoryStore();
  const { initProject } = useEditorStore();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [_feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  // Async Job Polling for AI Generation
  const { startJob, isPolling } = useJobPolling(null, {
    pollInterval: 2000,
    onComplete: (data) => {
      setFeedback({ type: 'success', text: 'Story Generated Successfully!' });
      applyAiGeneratedStory(
        data as {
          structure?: {
            scenes?: Array<{
              id?: string;
              type?: string;
              title?: string;
              description?: string;
              durationMs?: number;
            }>;
          };
        },
      );
    },
    onError: (err) => {
      setFeedback({ type: 'error', text: `Generation Failed: ${err}` });
    },
  });

  const handleAiGenerate = async () => {
    setFeedback(null);
    try {
      const res = await api.post<{ jobId: string }>('/jobs/story/generate-structure', {
        prompt: 'Cyberpunk city chase',
        projectId: currentStory?.projectId,
      });

      if (res.success && res.data) {
        startJob(res.data.jobId);
      } else {
        setFeedback({ type: 'error', text: 'Failed to start job' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error' });
    }
  };

  // Reactive compilation for Live Preview
  const previewTimeline = useMemo(() => {
    if (!currentStory) return null;
    return compileStoryToTimeline(currentStory);
  }, [currentStory]);

  const handleCompileConfirm = async () => {
    setFeedback({ type: 'success', text: 'Compiling Story to Timeline...' });

    try {
      await forkToTimeline(previewTimeline);

      if (currentStory && previewTimeline) {
        initProject(currentStory.projectId, 'Story Project (Forked)');
        useEditorStore.getState().loadTimeline(previewTimeline);
        navigate(`/editor/${currentStory.projectId}`);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Failed to fork project' });
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
        <Card className="flex-1 bg-card border border-border p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Layers size={18} />
            Global Vibe
          </h3>

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Tempo / Pace</div>
              <Select
                value={currentStory.globalVibe.tempo}
                onValueChange={(v) =>
                  updateGlobalVibe({
                    tempo: v as 'slow' | 'medium' | 'fast',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow & Relaxed</SelectItem>
                  <SelectItem value="medium">Medium / Standard</SelectItem>
                  <SelectItem value="fast">Fast & Energetic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              variant="secondary"
              className="justify-start"
              onClick={handleAiGenerate}
              disabled={isPolling}
            >
              {isPolling ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Wand2 size={16} className="mr-2" />
              )}
              {isPolling ? 'Dreaming...' : 'Remix Story Structure'}
            </Button>

            <Button size="sm" variant="secondary" className="justify-start">
              <Music size={16} className="mr-2" />
              Auto-Sync Music
            </Button>

            <div className="my-2 border-t border-border" />

            <Button className="w-full font-semibold" onClick={() => setIsModalOpen(true)}>
              Open in Advanced Editor
            </Button>
            <p className="text-xs text-muted-foreground text-center px-2">
              Warning: Editing in advanced mode will disconnect from Story Director.
            </p>
          </div>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to Advanced Editor?</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <AlertTriangle className="text-yellow-500 shrink-0" size={24} />
            <div className="text-sm">
              <p className="font-bold text-yellow-500">Point of No Return</p>
              <p>
                Story Mode features (AI vibes, scene reordering) will be disabled for this project
                version.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            You are about to fork this story into a standard timeline. Any further changes here will
            not reflect in Story Mode.
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleCompileConfirm();
                setIsModalOpen(false);
              }}
            >
              Confirm & Open Editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
