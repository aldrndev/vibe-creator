import { createFileRoute } from '@tanstack/react-router';
import { parseRouteSearch, sessionSearchSchema } from '@/lib/route-search';
import { ReactionCreatorPage } from '@/pages/tools/ReactionCreatorPage';

export const Route = createFileRoute('/_app/tools/reaction')({
  validateSearch: (search) => parseRouteSearch(sessionSearchSchema, search),
  component: ReactionCreatorPage,
});
