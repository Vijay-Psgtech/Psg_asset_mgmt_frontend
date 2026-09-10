import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:5010';
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
  configureServer: serveAssetDetailRoute,
  configurePreviewServer: serveAssetDetailRoute,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
