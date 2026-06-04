import { createFileRoute } from '@tanstack/react-router';
import { PromptDetailPage } from '@/pages/dashboard/PromptDetailPage';

export const Route = createFileRoute('/_app/dashboard_/prompts_/$id')({
  component: PromptDetailPage,
});
