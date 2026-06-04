import { createFileRoute } from '@tanstack/react-router';
import { ProjectsPage } from '@/pages/dashboard/ProjectsPage';

export const Route = createFileRoute('/_app/dashboard_/projects')({
  component: ProjectsPage,
});
