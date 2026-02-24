const fs = require('fs');
const path = require('path');

// Inicializar variables (pueden venir del entorno global o ser undefined)
let PRISMA_API_KEY = process.env.PRISMA_API_KEY;
let PRISMA_API_URL = process.env.PRISMA_API_URL;
let envFileContent = '';

try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    envFileContent = fs.readFileSync(envPath, 'utf8');

    // Parsear variables VITE_ o normales
    const matchKey = envFileContent.match(/^(?:VITE_)?PRISMA_API_KEY=(.+)$/m);
    if (matchKey) PRISMA_API_KEY = matchKey[1].trim();

    const matchUrl = envFileContent.match(/^(?:VITE_)?PRISMA_API_URL=(.+)$/m);
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

// Google Drive archive variables
const driveVars = [
  'VITE_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_DRIVE_REFRESH_TOKEN',
  'GOOGLE_DRIVE_FOLDER_ID',
  'ARCHIVE_DAYS_THRESHOLD',
  'ARCHIVE_CRON_ENABLED',
  'ENABLE_GLOBAL_SSO',
  'JWT_SSO_SECRET',
  'COOKIE_DOMAIN',
];
for (const key of driveVars) {
  let val;
  // Check env or parse from .env.local
  try {
    const matchLine = envFileContent && envFileContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (matchLine) val = matchLine[1].trim();
  } catch {}
  if (!val) val = process.env[key];
  if (val) proxyEnv[key] = val;
}

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
