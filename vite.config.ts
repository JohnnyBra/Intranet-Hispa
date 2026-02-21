import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Carga TODAS las vars de entorno (sin prefijo), no solo las VITE_
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3010,
        host: '0.0.0.0',
        // En desarrollo, Vite hace de proxy hacia Prisma para evitar CORS
        proxy: {
          '/api/prisma-users': {
            target: 'https://prisma.bibliohispa.es',
            changeOrigin: true,
            secure: false,
            rewrite: () => '/api/export/users',
            headers: {
              'Authorization': `Bearer ${env.PRISMA_API_KEY}`,
              'api_secret': env.PRISMA_API_KEY,
              'x-api-secret': env.PRISMA_API_KEY,
            },
          },
          '/api/prisma-auth': {
            target: 'https://prisma.bibliohispa.es',
            changeOrigin: true,
            secure: false,
            rewrite: () => '/api/auth/external-check',
          },
          '/api/proxy': {
            target: 'http://127.0.0.1:3011',
            changeOrigin: false,
          },
          '/api/auth': {
            target: 'http://127.0.0.1:3011',
            changeOrigin: false,
          },
          '/api/upload': {
            target: 'http://127.0.0.1:3011',
            changeOrigin: false,
          },
          '/api/file': {
            target: 'http://127.0.0.1:3011',
            changeOrigin: false,
          },
          '/api/data': {
            target: 'http://127.0.0.1:3011',
            changeOrigin: false,
          },
          '/uploads': {
            target: 'http://127.0.0.1:3011',
            changeOrigin: false,
          },
        },
      },
      preview: {
        port: 3010,
        host: '0.0.0.0',
        allowedHosts: true,
        // En producción, nginx hace de proxy (ver install.sh)
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
