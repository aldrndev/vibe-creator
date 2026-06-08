import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      refetchOnWindowFocus: false, // Don't refetch when tab gets focus
      refetchOnReconnect: true, // Refetch when network reconnects
      retry: 1, // Retry failed requests once
    },
  },
});
