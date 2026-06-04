import { createFileRoute } from '@tanstack/react-router';
import { parseRouteSearch, paymentSearchSchema } from '@/lib/route-search';
import { PricingPage } from '@/pages/dashboard/PricingPage';

export const Route = createFileRoute('/_app/dashboard_/pricing')({
  validateSearch: (search) => parseRouteSearch(paymentSearchSchema, search),
  component: PricingPage,
});
