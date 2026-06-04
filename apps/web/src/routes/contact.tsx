import { createFileRoute } from '@tanstack/react-router';
import { ContactPage } from '@/pages/public/LegalPages';

export const Route = createFileRoute('/contact')({
  component: ContactPage,
});
