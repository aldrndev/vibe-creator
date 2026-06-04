import { createFileRoute } from '@tanstack/react-router';
import { PrivacyPage } from '@/pages/public/LegalPages';

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
});
