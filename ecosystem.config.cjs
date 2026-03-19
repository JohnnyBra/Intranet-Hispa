const fs = require('fs');
const path = require('path');

// Parsear .env.local completo (acepta VITE_ o sin prefijo)
const proxyEnv = { NODE_ENV: 'production' };

try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^(?:VITE_)?([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) proxyEnv[m[1]] = m[2].trim();
    });
  }
} catch (err) {
  console.error('Error leyendo .env.local:', err);
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
