import { createFileRoute } from '@tanstack/react-router';
import { TermsPage } from '@/pages/public/LegalPages';

export const Route = createFileRoute('/terms')({
  component: TermsPage,
});
