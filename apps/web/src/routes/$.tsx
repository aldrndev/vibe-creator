import { createFileRoute } from '@tanstack/react-router';
import { redirectUnknownRoute } from '@/lib/route-guards';

export const Route = createFileRoute('/$')({
  beforeLoad: redirectUnknownRoute,
});
