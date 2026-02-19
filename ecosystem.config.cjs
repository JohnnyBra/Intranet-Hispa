const fs = require('fs');
const path = require('path');

// Leer PRISMA_API_KEY de .env.local sin exponer el valor en el bundle del cliente
let PRISMA_API_KEY = 'ojosyculos';
try {
  const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  const match = env.match(/^PRISMA_API_KEY=(.+)$/m);
  if (match) PRISMA_API_KEY = match[1].trim();
} catch {}

module.exports = {
  apps: [
    {
      name: 'intranet-hispa',
      script: 'npm',
      args: 'run preview',
      cwd: __dirname,
      watch: false,
      env: { NODE_ENV: 'production' },
      restart_delay: 3000,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'intranet-hispa-proxy',
      script: 'proxy-server.js',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PRISMA_API_KEY,
      },
      restart_delay: 3000,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
