import { createFileRoute } from '@tanstack/react-router';
import { AboutPage } from '@/pages/public/AboutPage';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});
