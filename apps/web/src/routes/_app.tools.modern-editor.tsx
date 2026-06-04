import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tools/modern-editor')({
  beforeLoad: () => {
    throw redirect({ to: '/tools/video-studio', replace: true });
  },
});
