import { createFileRoute } from '@tanstack/react-router';
import { StoryDirectorPage } from '@/pages/tools/StoryDirectorPage';

export const Route = createFileRoute('/_app/tools/story-director')({
  component: StoryDirectorPage,
});
