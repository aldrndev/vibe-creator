import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/dashboard_/exports')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/projects', replace: true });
  },
});
