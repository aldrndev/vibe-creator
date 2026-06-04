import { createFileRoute } from '@tanstack/react-router';
import { parseRouteSearch, videoStudioSearchSchema } from '@/lib/route-search';
import { ModernEditorPage } from '@/pages/tools/ModernEditorPage';

export const Route = createFileRoute('/_app/tools/video-studio')({
  validateSearch: (search) => parseRouteSearch(videoStudioSearchSchema, search),
  component: ModernEditorPage,
});
