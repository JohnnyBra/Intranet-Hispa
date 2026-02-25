const fs = require('fs');
const path = require('path');

// Inicializar variables (pueden venir del entorno global o ser undefined)
let PRISMA_API_KEY = process.env.PRISMA_API_KEY;
let PRISMA_API_URL = process.env.PRISMA_API_URL;

try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');

    // Parsear variables VITE_ o normales
    const matchKey = env.match(/^(?:VITE_)?PRISMA_API_KEY=(.+)$/m);
    if (matchKey) PRISMA_API_KEY = matchKey[1].trim();

    const matchUrl = env.match(/^(?:VITE_)?PRISMA_API_URL=(.+)$/m);
    if (matchUrl) PRISMA_API_URL = matchUrl[1].trim();
  }
} catch (err) {
  console.error('Error leyendo .env.local:', err);
}

// Construir objeto de entorno para el proxy
const proxyEnv = {
  NODE_ENV: 'production',
};

// Solo añadir si tienen valor (evita pasar "undefined" como string)
if (PRISMA_API_KEY) proxyEnv.PRISMA_API_KEY = PRISMA_API_KEY;
if (PRISMA_API_URL) proxyEnv.PRISMA_API_URL = PRISMA_API_URL;

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
      env: proxyEnv,
      restart_delay: 3000,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
