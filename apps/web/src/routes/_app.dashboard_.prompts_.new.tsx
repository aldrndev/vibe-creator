import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PromptBuilderPage } from '@/pages/dashboard/PromptBuilderPage';

const newPromptSearchSchema = z.object({
  edit: z.string().optional(),
});

export const Route = createFileRoute('/_app/dashboard_/prompts_/new')({
  validateSearch: (search) => newPromptSearchSchema.parse(search),
  component: PromptBuilderPage,
});
