import {
  type DashboardSummaryResponse,
  dashboardSummaryResponseSchema,
} from '@vibe-creator/shared';
import { api } from '@/services/api';

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await api.get<unknown>('/dashboard/summary');
  if (!response.success) {
    throw new Error(response.error.message || 'Dashboard belum bisa dimuat.');
  }

  return dashboardSummaryResponseSchema.parse(response.data);
}
