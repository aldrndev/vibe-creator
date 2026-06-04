import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tools/reaction-creator')({
  beforeLoad: () => {
    throw redirect({ to: '/tools/reaction', replace: true });
  },
});
