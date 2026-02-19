import http from 'http';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Leer configuración del entorno
const PRISMA_URL = process.env.PRISMA_API_URL || 'https://prisma.bibliohispa.es/api/export/users';
const API_KEY = process.env.PRISMA_API_KEY || 'ojosyculos';
const PORT = 3011;

const PRISMA_AUTH_URL = 'https://prisma.bibliohispa.es/api/auth/external-check';

// ── File storage ─────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME_TO_EXT = {
  'image/jpeg':       '.jpg',
  'image/png':        '.png',
  'image/gif':        '.gif',
  'image/webp':       '.webp',
  'application/pdf':  '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'video/mp4':        '.mp4',
  'video/webm':       '.webm',
};

const EXT_TO_MIME = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.pdf':  'application/pdf',
  '.doc':  'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
};

const sanitize = s => String(s).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 80);

// ── Serve a static file ───────────────────────────────────────────────────────
const serveFile = (filePath, res) => {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type':   EXT_TO_MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control':  'public, max-age=31536000',
    });
    fs.createReadStream(filePath).pipe(res);
  });
};

// ── Handle file upload ────────────────────────────────────────────────────────
const handleUpload = (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const type     = urlObj.searchParams.get('type')     || 'resource';
  const category = urlObj.searchParams.get('category') || 'general';
  const eventId  = urlObj.searchParams.get('eventId')  || 'misc';
  const folderId = urlObj.searchParams.get('folderId') || 'misc';
  const key      = urlObj.searchParams.get('key')      || 'file';

  const rawFilename   = req.headers['x-filename'];
  const filename      = rawFilename ? decodeURIComponent(rawFilename) : 'upload';
  const contentType   = (req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim();

  // Determine subdirectory based on upload type
  let subDir;
  if (type === 'photo') {
    subDir = path.join('events', sanitize(eventId), sanitize(folderId));
  } else if (type === 'dashboard') {
    subDir = 'dashboard';
  } else {
    subDir = path.join('resources', sanitize(category));
  }

  const targetDir = path.join(UPLOADS_DIR, subDir);
  fs.mkdirSync(targetDir, { recursive: true });

  const sanitizedFilename = sanitize(filename);
  const ext      = path.extname(sanitizedFilename) || MIME_TO_EXT[contentType] || '.bin';
  const base     = path.basename(sanitizedFilename, ext);
  // Dashboard images overwrite on update (no timestamp); others get unique names
  const finalName = type === 'dashboard'
    ? sanitize(key) + ext
    : `${base}_${Date.now()}${ext}`;

  const finalPath = path.resolve(targetDir, finalName);

  // Security: prevent path traversal
  if (!finalPath.startsWith(UPLOADS_DIR)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Invalid filename' }));
    return;
  }

  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    fs.writeFile(finalPath, Buffer.concat(chunks), err => {
      if (err) {
        console.error(`[${new Date().toISOString()}] Write error:`, err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
        return;
      }
      const url = '/uploads/' + subDir.replace(/\\/g, '/') + '/' + finalName;
      console.log(`[${new Date().toISOString()}] File saved → ${url}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, url }));
    });
  });
  req.on('error', err => {
    console.error(`[${new Date().toISOString()}] Upload stream error:`, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: err.message }));
  });
};

// ─────────────────────────────────────────────────────────────────────────────

console.log(`[${new Date().toISOString()}] Starting Prisma proxy + upload server...`);
console.log(`[${new Date().toISOString()}] Target URL: ${PRISMA_URL}`);
console.log(`[${new Date().toISOString()}] API Key loaded: ${API_KEY ? 'Yes' : 'No'}`);
console.log(`[${new Date().toISOString()}] Uploads directory: ${UPLOADS_DIR}`);

const server = http.createServer(async (req, res) => {

  // ── Static file serving for /uploads/ ────────────────────────────────────
  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    const relativePath = decodeURIComponent(req.url.slice('/uploads/'.length));
    const filePath = path.resolve(UPLOADS_DIR, relativePath);
    if (!filePath.startsWith(UPLOADS_DIR)) {
      res.writeHead(403);
      res.end();
      return;
    }
    serveFile(filePath, res);
    return;
  }

  // ── File upload ───────────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url.startsWith('/api/upload')) {
    console.log(`[${new Date().toISOString()}] Upload request: ${req.url}`);
    handleUpload(req, res);
    return;
  }

  // ── Prisma users proxy ────────────────────────────────────────────────────
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

  // ── Prisma auth proxy ─────────────────────────────────────────────────────
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
  console.log(`[${new Date().toISOString()}] Proxy + upload server listening on http://127.0.0.1:${PORT}`);
});
