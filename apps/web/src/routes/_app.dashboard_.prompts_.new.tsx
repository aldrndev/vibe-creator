import { createFileRoute } from '@tanstack/react-router';
import { PromptBuilderPage } from '@/pages/dashboard/PromptBuilderPage';

export const Route = createFileRoute('/_app/dashboard_/prompts_/new')({
  component: PromptBuilderPage,
});
