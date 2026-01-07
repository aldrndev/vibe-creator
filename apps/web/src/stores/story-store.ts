import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StoryProject, StoryScene } from "@vibe-creator/shared";
import { STORY_SCHEMA_VERSION } from "@vibe-creator/shared";
import { logger } from "@/lib/logger";

interface StoryState {
  currentStory: StoryProject | null;
  isLocal: boolean;
  isLoading: boolean;
  isSaving?: boolean;

  // Actions
  initStory: (projectId: string) => void;
  loadStory: (projectId: string) => Promise<void>;
  updateGlobalVibe: (updates: Partial<StoryProject["globalVibe"]>) => void;
  saveToCloud: () => void;

  // Scene Actions
  addScene: (scene: StoryScene) => void;
  updateScene: (sceneId: string, updates: Partial<StoryScene>) => void;
  removeScene: (sceneId: string) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;

  // Locking
  forkToTimeline: (compiledTimeline: unknown) => Promise<void>;

  // AI Actions
  applyAiGeneratedStory: (aiResult: {
    structure?: {
      scenes?: Array<{
        id?: string;
        type?: string;
        title?: string;
        description?: string;
        durationMs?: number;
      }>;
    };
  }) => void;
}

const DEFAULT_GLOBAL_VIBE: StoryProject["globalVibe"] = {
  tempo: "medium",
};

import { api } from "@/services/api";

// Debounce helper
type DebouncedFunction = (...args: unknown[]) => void;
const debounce = <T extends DebouncedFunction>(fn: T, ms: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

export const useStoryStore = create<StoryState>()(
  persist(
    (set, get) => ({
      currentStory: null,
      isLocal: true,
      isLoading: false,
      isSaving: false,

      initStory: (projectId) => {
        set({
          isLocal: true,
          currentStory: {
            id: crypto.randomUUID(),
            projectId,
            version: STORY_SCHEMA_VERSION,
            isFrozen: false,
            globalVibe: DEFAULT_GLOBAL_VIBE,
            scenes: [],
          },
        });
      },

      loadStory: async (projectId) => {
        set({ isLoading: true });
        try {
          const res = await api.get<{ storyData: StoryProject; mode: string }>(
            `/projects/${projectId}`
          );
          if (res.success && res.data.storyData) {
            // If project is already in TIMELINE mode, we should perhaps warn or handle it
            // For now, load the data if it exists
            set({
              isLocal: false,
              currentStory: res.data.storyData,
            });
          } else {
            // Initialize fresh if no story data found
            get().initStory(projectId);
          }
        } catch (error) {
          logger.error("Failed to load story", error);
          get().initStory(projectId); // Fallback
        } finally {
          set({ isLoading: false });
        }
      },

      saveToCloud: debounce(async () => {
        const { currentStory, isLocal } = get();
        if (!currentStory) return;

        set({ isSaving: true });
        try {
          if (isLocal) {
            // First save: Create Project
            // We don't send the ID; the server generates it.
            const res = await api.post<{ id: string }>("/projects", {
              title: "Untitled Story",
              description: "Created with AI Director",
              mode: "STORY",
              storyData: currentStory,
            });

            if (res.success && res.data) {
              // Update store with real ID and mark as saved (not local)
              const newId = res.data.id;
              set((state) => ({
                isLocal: false,
                currentStory: state.currentStory
                  ? {
                      ...state.currentStory,
                      projectId: newId,
                    }
                  : null,
              }));

              // Silently update URL without reload
              window.history.replaceState(
                null,
                "",
                `/tools/story-director/${newId}`
              );
            }
          } else {
            // Subsequent saves: Patch
            await api.patch(`/projects/${currentStory.projectId}`, {
              storyData: currentStory,
              mode: "STORY",
            });
          }
        } catch (error) {
          logger.error("Failed to save story", error);
        } finally {
          set({ isSaving: false });
        }
      }, 2000), // Auto-save every 2s of inactivity

      updateGlobalVibe: (updates) => {
        set((state) => {
          if (!state.currentStory || state.currentStory.isFrozen) return state;
          return {
            currentStory: {
              ...state.currentStory,
              globalVibe: { ...state.currentStory.globalVibe, ...updates },
            },
          };
        });
        get().saveToCloud();
      },

      addScene: (scene) => {
        set((state) => {
          if (!state.currentStory || state.currentStory.isFrozen) return state;
          return {
            currentStory: {
              ...state.currentStory,
              scenes: [...state.currentStory.scenes, scene],
            },
          };
        });
        get().saveToCloud();
      },

      updateScene: (sceneId, updates) => {
        set((state) => {
          if (!state.currentStory || state.currentStory.isFrozen) return state;
          return {
            currentStory: {
              ...state.currentStory,
              scenes: state.currentStory.scenes.map((s) =>
                s.id === sceneId ? { ...s, ...updates } : s
              ),
            },
          };
        });
        get().saveToCloud();
      },

      removeScene: (sceneId) => {
        set((state) => {
          if (!state.currentStory || state.currentStory.isFrozen) return state;
          return {
            currentStory: {
              ...state.currentStory,
              scenes: state.currentStory.scenes.filter((s) => s.id !== sceneId),
            },
          };
        });
        get().saveToCloud();
      },

      reorderScenes: (startIndex, endIndex) => {
        set((state) => {
          if (!state.currentStory || state.currentStory.isFrozen) return state;
          const newScenes = [...state.currentStory.scenes];
          const [removed] = newScenes.splice(startIndex, 1);
          if (removed) {
            newScenes.splice(endIndex, 0, removed);
          }
          return {
            currentStory: {
              ...state.currentStory,
              scenes: newScenes,
            },
          };
        });
        get().saveToCloud();
      },

      forkToTimeline: async (compiledTimeline: unknown) => {
        set((state) => {
          if (!state.currentStory) return state;
          return {
            currentStory: {
              ...state.currentStory,
              isFrozen: true,
              frozenAt: new Date().toISOString(),
            },
          };
        });

        // Force immediate save when forking
        const { currentStory } = get();
        if (currentStory) {
          try {
            // 1. Save Story Mode state (Frozen)
            await api.patch(`/projects/${currentStory.projectId}`, {
              storyData: currentStory,
              mode: "TIMELINE",
            });

            // 2. Create a Version Snapshot with the compiled timeline
            // This ensures we have a restore point even if Editor doesn't load it yet
            if (compiledTimeline) {
              await api.post(`/projects/${currentStory.projectId}/versions`, {
                name: "Forked from Story Mode",
                description: `Auto-generated from Story Mode`,
                timelineData: compiledTimeline as Record<string, unknown>,
                textOverlays: [],
                metadata: { source: "story-director" },
              });
            }
          } catch (error) {
            logger.error("Failed to fork project", error);
            // Revert frozen state?
            set((state) => ({
              currentStory: state.currentStory
                ? { ...state.currentStory, isFrozen: false }
                : null,
            }));
            throw error;
          }
        }
      },
      applyAiGeneratedStory: (aiResult) => {
        set((state) => {
          if (!state.currentStory || state.currentStory.isFrozen) return state;

          // Map AI result (Mock or Real) to StoryScenes
          // Expecting aiResult.structure.scenes
          const newScenes: StoryScene[] =
            aiResult.structure?.scenes?.map((s) => ({
              id: s.id || crypto.randomUUID(),
              type: (s.type || "content") as StoryScene["type"],
              title: s.title || "AI Scene",
              description: s.description || "",
              targetDurationMs: s.durationMs || 5000,
              assets: {},
            })) || [];

          return {
            currentStory: {
              ...state.currentStory,
              scenes: newScenes,
            },
          };
        });
        get().saveToCloud();
      },
    }),
    {
      name: "story-storage",
    }
  )
);
