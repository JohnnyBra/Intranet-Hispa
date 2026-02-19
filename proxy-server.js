import http from 'http';
import fetch from 'node-fetch';

// Leer configuración del entorno
const PRISMA_URL = process.env.PRISMA_API_URL || 'https://prisma.bibliohispa.es/api/export/users';
const API_KEY = process.env.PRISMA_API_KEY || 'ojosyculos';
const PORT = 3011;

console.log(`[${new Date().toISOString()}] Starting Prisma proxy server...`);
console.log(`[${new Date().toISOString()}] Target URL: ${PRISMA_URL}`);
console.log(`[${new Date().toISOString()}] API Key loaded: ${API_KEY ? 'Yes' : 'No'}`);

const PRISMA_AUTH_URL = 'https://prisma.bibliohispa.es/api/auth/external-check';

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/prisma-users') {
    console.log(`[${new Date().toISOString()}] Request received: ${req.method} ${req.url}`);

    try {
      const upstream = await fetch(PRISMA_URL, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'api_secret': API_KEY,
          'x-api-secret': API_KEY,
          'Accept': 'application/json',
        },
      });

      console.log(`[${new Date().toISOString()}] Upstream status: ${upstream.status}`);

      const body = await upstream.text();
      res.writeHead(upstream.status, {
        'Content-Type': 'application/json'
      });
      res.end(body);

    } catch (err) {
      console.error(`[${new Date().toISOString()}] Proxy error:`, err);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Gateway',
        message: err.message,
        details: 'Check server logs for more info'
      }));
    }

  } else if (req.method === 'POST' && req.url === '/api/prisma-auth') {
    console.log(`[${new Date().toISOString()}] Request received: ${req.method} ${req.url}`);

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const upstream = await fetch(PRISMA_AUTH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body,
        });

        console.log(`[${new Date().toISOString()}] Upstream auth status: ${upstream.status}`);

        const responseBody = await upstream.text();
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
        res.end(responseBody);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Auth proxy error:`, err);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });

  } else {
    console.log(`[${new Date().toISOString()}] 404 Not Found: ${req.url}`);
    res.writeHead(404);
    res.end();
  }
});

server.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Server error:`, err);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[${new Date().toISOString()}] Prisma proxy listening on http://127.0.0.1:${PORT}`);
});
