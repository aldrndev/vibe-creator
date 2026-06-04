import { createFileRoute } from '@tanstack/react-router';
import { aiDirectorSearchSchema, parseRouteSearch } from '@/lib/route-search';
import { AiDirectorPage } from '@/pages/tools/AiDirectorPage';

export const Route = createFileRoute('/_app/tools/ai-director')({
  validateSearch: (search) => parseRouteSearch(aiDirectorSearchSchema, search),
  component: AiDirectorPage,
});
