import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollShadow, Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { useStoryStore } from "@/stores/story-store";
import { SceneCard } from "./SceneCard";
import type { StoryScene } from "@vibe-creator/shared";

export function StoryBoard() {
  const { currentStory, reorderScenes, addScene, removeScene, updateScene } =
    useStoryStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && currentStory) {
      const oldIndex = currentStory.scenes.findIndex((s) => s.id === active.id);
      const newIndex = currentStory.scenes.findIndex((s) => s.id === over?.id);
      reorderScenes(oldIndex, newIndex);
    }
  };

  const handleAddScene = () => {
    const newScene: StoryScene = {
      id: crypto.randomUUID(),
      type: "content",
      title: "New Scene",
      description: "Describe what happens here...",
      targetDurationMs: 5000,
      assets: {},
    };
    addScene(newScene);
  };

  if (!currentStory) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
        <ScrollShadow className="flex-1 flex flex-col gap-4 pr-2 pb-20">
          <SortableContext
            items={currentStory.scenes.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {currentStory.scenes.map((scene, index) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                index={index}
                onRemove={removeScene}
                onUpdate={updateScene}
              />
            ))}
          </SortableContext>

          <Button
            variant="bordered"
            className="h-16 border-2 border-dashed border-divider/50 hover:border-primary/50 text-foreground/50 shrink-0"
            startContent={<Plus size={20} />}
            onPress={handleAddScene}
          >
            Add Scene
          </Button>
        </ScrollShadow>
      </div>
    </DndContext>
  );
}
