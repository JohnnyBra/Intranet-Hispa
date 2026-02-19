/**
 * Proxy local para la API de Prisma.
 * Evita el problema de CORS (llamadas directas desde el navegador)
 * y el problema de SSL en el proxy nginx → HTTPS externo.
 *
 * Puerto: 3011 (solo escucha en loopback, no expuesto al exterior)
 * nginx redirige /api/prisma-users → http://127.0.0.1:3011
 */
import http from 'http';

const PRISMA_URL = 'https://prisma.bibliohispa.es/api/export/users';
const API_KEY = process.env.PRISMA_API_KEY || 'ojosyculos';
const PORT = 3011;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/prisma-users') {
    try {
      const upstream = await fetch(PRISMA_URL, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'api_secret': API_KEY,
          'x-api-secret': API_KEY,
          'Accept': 'application/json',
        },
      });

      const body = await upstream.text();
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      res.end(body);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Prisma proxy escuchando en http://127.0.0.1:${PORT}`);
});
