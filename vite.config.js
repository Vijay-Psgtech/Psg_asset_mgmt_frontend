import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_URL || 'http://localhost:5010';
const assetDetailPath = /^\/assets\/[a-f\d]{24}$/i;

const serveAssetDetailRoute = (server) => {
  server.middlewares.use((request, _response, next) => {
    if (request.method === 'GET' && assetDetailPath.test(request.url || '')) {
      request.url = '/index.html';
    }
    next();
  });
};

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
  configureServer: serveAssetDetailRoute,
  configurePreviewServer: serveAssetDetailRoute,
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['localhost', 'assettest.psginstitutions.in'],
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
