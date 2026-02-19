import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Carga TODAS las vars de entorno (sin prefijo), no solo las VITE_
    const env = loadEnv(mode, '.', '');
    const prismaKey = env.PRISMA_API_KEY || env.VITE_PRISMA_API_KEY || '';

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
              'Authorization': `Bearer ${prismaKey}`,
              'api_secret': prismaKey,
              'x-api-secret': prismaKey,
            },
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
