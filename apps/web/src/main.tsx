import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,         // 2 minutes - data considered fresh
      gcTime: 10 * 60 * 1000,           // 10 minutes - cache garbage collection
      refetchOnWindowFocus: false,      // Don't refetch when tab gets focus
      refetchOnReconnect: true,         // Refetch when network reconnects
      retry: 1,                         // Retry failed requests once
    },
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--heroui-content1))',
              color: 'hsl(var(--heroui-foreground))',
              border: '1px solid hsl(var(--heroui-divider))',
            },
          }}
        />
      </HeroUIProvider>
    </QueryClientProvider>
  </StrictMode>
);
