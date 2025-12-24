import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // FFmpeg.wasm is incompatible with Vite's dep optimizer
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    port: 5173,
    // Required headers for FFmpeg.wasm (SharedArrayBuffer)
    // Using 'credentialless' for COEP to allow blob URLs
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Ensure cookies are forwarded properly
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        // Configure to handle cookies correctly
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Ensure Set-Cookie headers are passed through
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              // Rewrite cookie path if needed
              proxyRes.headers['set-cookie'] = setCookie.map((cookie: string) =>
                cookie.replace(/Domain=[^;]+;?/gi, '')
              );
            }
          });
        },
      },
    },
  },
});
