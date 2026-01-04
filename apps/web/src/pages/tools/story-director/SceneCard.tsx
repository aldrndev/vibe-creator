import { Card, CardBody, Button, Chip } from "@heroui/react";
import { Play, Wand2, Mic, Move, Trash2 } from "lucide-react";
import type { StoryScene } from "@vibe-creator/shared";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SceneCardProps {
  scene: StoryScene;
  index: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<StoryScene>) => void;
}

export function SceneCard({
  scene,
  index,
  onRemove,
  onUpdate,
}: SceneCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <Card className="border border-divider bg-content1 hover:bg-content1/80 transition-colors">
        <CardBody className="flex flex-row gap-4 items-center p-4">
          {/* Drag Handle & Index */}
          <div
            className="flex flex-col items-center justify-center w-8 gap-2 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <span className="text-lg font-bold text-foreground/40">
              {(index + 1).toString().padStart(2, "0")}
            </span>
            <Move size={14} className="text-foreground/20" />
          </div>

          {/* Thumbnail */}
          <div className="w-32 h-20 bg-black/20 rounded-lg flex items-center justify-center relative group overflow-hidden shrink-0">
            {scene.assets.visual?.url ? (
              <img
                src={scene.assets.visual.url}
                className="w-full h-full object-cover"
                alt="Scene preview"
              />
            ) : (
              <Play className="text-foreground/20 group-hover:text-primary transition-colors" />
            )}

            {/* Quick Actions Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={() => {
                  /* Regenerate visual */
                }}
              >
                <Wand2 size={14} />
              </Button>
            </div>
          </div>

          {/* Content Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Chip
                size="sm"
                variant="flat"
                color={
                  scene.type === "intro"
                    ? "secondary"
                    : scene.type === "outro"
                    ? "warning"
                    : "primary"
                }
                className="h-5 text-xs px-1"
              >
                {scene.type.toUpperCase()}
              </Chip>
              <input
                className="bg-transparent border-none font-semibold focus:outline-none focus:ring-0 w-full truncate"
                value={scene.title}
                onChange={(e) => onUpdate(scene.id, { title: e.target.value })}
              />
            </div>

            <textarea
              className="w-full bg-transparent text-sm text-foreground/60 resize-none focus:outline-none h-10"
              placeholder="Describe what happens in this scene..."
              value={scene.description}
              onChange={(e) =>
                onUpdate(scene.id, { description: e.target.value })
              }
            />

            <div className="flex items-center gap-3 mt-2">
              <div
                className={`flex items-center gap-1 text-xs ${
                  scene.assets.audio ? "text-primary" : "text-foreground/30"
                }`}
              >
                <Mic size={12} />
                <span>{scene.assets.audio ? "AI Voice" : "No Voice"}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-foreground/50 ml-auto bg-content2 px-2 py-0.5 rounded cursor-pointer hover:bg-content2/80">
                <span>{scene.targetDurationMs / 1000}s</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              isIconOnly
              variant="light"
              color="danger"
              size="sm"
              onPress={() => onRemove(scene.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
