import { createFileRoute } from '@tanstack/react-router';
import { loopCreatorSearchSchema, parseRouteSearch } from '@/lib/route-search';
import { LoopCreatorPage } from '@/pages/tools/LoopCreatorPage';

export const Route = createFileRoute('/_app/tools/loop-creator')({
  validateSearch: (search) => parseRouteSearch(loopCreatorSearchSchema, search),
  component: LoopCreatorPage,
});
