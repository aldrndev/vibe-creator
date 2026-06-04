import { createFileRoute } from '@tanstack/react-router';
import { EditorPage } from '@/pages/editor/EditorPage';

export const Route = createFileRoute('/_fullscreen/tools/editor')({
  component: EditorPage,
});
