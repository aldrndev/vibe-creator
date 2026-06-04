import { createFileRoute } from '@tanstack/react-router';
import { PromptsPage } from '@/pages/dashboard/PromptsPage';

export const Route = createFileRoute('/_app/dashboard_/prompts')({
  component: PromptsPage,
});
