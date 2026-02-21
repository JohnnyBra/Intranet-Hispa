import http from 'http';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Leer configuración del entorno
const PRISMA_URL = process.env.PRISMA_API_URL || 'https://prisma.bibliohispa.es/api/export/users';
const API_KEY = process.env.PRISMA_API_KEY || 'ojosyculos';
const PORT = 3011;

const PRISMA_AUTH_URL = 'https://prisma.bibliohispa.es/api/auth/external-check';

// ── Shared data store (JSON files) ───────────────────────────────────────────
const DATA_DIR = path.resolve(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Only these keys are allowed — prevents arbitrary file writes
const VALID_DATA_KEYS = new Set([
  'hispa_resources',
  'hispa_events',
  'hispa_nav',
  'hispa_sections',
  'hispa_dashboard_images',
]);

// ── File storage ─────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.mp4': 'video/mp4',
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
      'Content-Type': EXT_TO_MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=31536000',
    });
    fs.createReadStream(filePath).pipe(res);
  });
};

// ── Handle file upload ────────────────────────────────────────────────────────
const handleUpload = (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const type = urlObj.searchParams.get('type') || 'resource';
  const category = urlObj.searchParams.get('category') || 'general';
  const eventId = urlObj.searchParams.get('eventId') || 'misc';
  const folderId = urlObj.searchParams.get('folderId') || 'misc';
  // Client sends already-slugified names for readable folder paths
  const eventSlug = urlObj.searchParams.get('eventSlug') || sanitize(eventId);
  const classSlug = urlObj.searchParams.get('classSlug') || sanitize(folderId);
  const key = urlObj.searchParams.get('key') || 'file';

  const rawFilename = req.headers['x-filename'];
  // Client is responsible for providing meaningful filenames; server only sanitizes
  const filename = rawFilename ? decodeURIComponent(rawFilename) : `upload_${Date.now()}`;
  const contentType = (req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim();

  // Determine subdirectory based on upload type
  let subDir;
  if (type === 'photo') {
    // Use human-readable slugs: uploads/events/{evento}/{clase}/
    subDir = path.join('events', sanitize(eventSlug), sanitize(classSlug));
  } else if (type === 'dashboard') {
    subDir = 'dashboard';
  } else {
    subDir = path.join('resources', sanitize(category));
  }

  const targetDir = path.join(UPLOADS_DIR, subDir);
  fs.mkdirSync(targetDir, { recursive: true });

  const sanitizedFilename = sanitize(filename);
  const ext = path.extname(sanitizedFilename) || MIME_TO_EXT[contentType] || '.bin';
  // Dashboard images overwrite previous version; all others use the filename the client provides
  const finalName = type === 'dashboard'
    ? sanitize(key) + ext
    : sanitizedFilename || `upload_${Date.now()}${ext}`;

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

const getCookies = (req) => {
  const cookies = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookies[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return cookies;
};

const server = http.createServer(async (req, res) => {

  // --- Global SSO Middleware ---
  if (process.env.ENABLE_GLOBAL_SSO === 'true') {
    if (req.url.startsWith('/api/') && !req.url.startsWith('/api/prisma-auth')) {
      const cookies = getCookies(req);
      const token = cookies.BIBLIO_SSO_TOKEN;
      if (token) {
        try {
          const JWT_SSO_SECRET = process.env.JWT_SSO_SECRET || 'fallback-secret';
          const decoded = jwt.verify(token, JWT_SSO_SECRET);
          if (decoded.role === 'FAMILY' || decoded.role === 'STUDENT') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Acceso denegado a satélites para este rol.' }));
            return;
          }
          req.ssoUser = decoded;
        } catch (e) {
          // Fallback, let it pass
        }
      }
    }
  }

  // ── Shared data store: read ───────────────────────────────────────────────
  if (req.method === 'GET' && req.url.startsWith('/api/data')) {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const key = urlObj.searchParams.get('key') || '';
    if (!VALID_DATA_KEYS.has(key)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid key' }));
      return;
    }
    const filePath = path.join(DATA_DIR, `${key}.json`);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        // File doesn't exist yet — client will use built-in defaults
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // ── Shared data store: write ──────────────────────────────────────────────
  if (req.method === 'POST' && req.url.startsWith('/api/data')) {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const key = urlObj.searchParams.get('key') || '';
    if (!VALID_DATA_KEYS.has(key)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid key' }));
      return;
    }
    const filePath = path.join(DATA_DIR, `${key}.json`);
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      fs.writeFile(filePath, Buffer.concat(chunks), err => {
        if (err) {
          console.error(`[${new Date().toISOString()}] Data write error (${key}):`, err);
          res.writeHead(500);
          res.end();
          return;
        }
        res.writeHead(200);
        res.end();
      });
    });
    return;
  }

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

  // ── File delete ───────────────────────────────────────────────────────────
  if (req.method === 'DELETE' && req.url.startsWith('/api/file')) {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const filePath_param = decodeURIComponent(urlObj.searchParams.get('path') || '');
    if (!filePath_param.startsWith('/uploads/')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid path' }));
      return;
    }
    const relativePath = filePath_param.slice('/uploads/'.length);
    const absPath = path.resolve(UPLOADS_DIR, relativePath);
    if (!absPath.startsWith(UPLOADS_DIR)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    fs.unlink(absPath, err => {
      if (err) {
        console.error(`[${new Date().toISOString()}] Delete error:`, err);
        res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      console.log(`[${new Date().toISOString()}] File deleted → ${filePath_param}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
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
        const headers = { 'Content-Type': 'application/json' };

        // Crear cookie SSO directamente (en vez de retransmitir de PrismaEdu)
        if (upstream.ok && process.env.ENABLE_GLOBAL_SSO === 'true') {
          try {
            const parsed = JSON.parse(responseBody);
            if (parsed.success) {
              const user = parsed.user || parsed;
              const rawRole = (user.role || 'TUTOR').toUpperCase();
              const ssoRole = rawRole === 'TUTOR' ? 'TEACHER' : rawRole;
              const parsedBody = JSON.parse(body);
              const userEmail = (user.email || parsedBody.username || '').toLowerCase();
              const JWT_SSO_SECRET = process.env.JWT_SSO_SECRET || 'fallback-secret';
              const cookieDomain = process.env.COOKIE_DOMAIN || '.bibliohispa.es';
              const ssoPayload = { userId: user.id, email: userEmail, role: ssoRole, profileId: user.id };
              const ssoToken = jwt.sign(ssoPayload, JWT_SSO_SECRET, { expiresIn: '8h' });
              headers['set-cookie'] = `BIBLIO_SSO_TOKEN=${ssoToken}; Domain=${cookieDomain}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`;
            }
          } catch (e) {
            // Ignore SSO cookie creation errors
          }
        }

        res.writeHead(upstream.status, headers);
        res.end(responseBody);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Auth proxy error:`, err);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });

    // ── SSO checks proxy ────────────────────────────────────────────────────────
  } else if (req.method === 'GET' && req.url === '/api/proxy/me') {
    const cookies = getCookies(req);
    const token = cookies.BIBLIO_SSO_TOKEN;
    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: 'No SSO session' }));
    }
    try {
      const JWT_SSO_SECRET = process.env.JWT_SSO_SECRET || 'fallback-secret';
      const decoded = jwt.verify(token, JWT_SSO_SECRET);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        user: { id: decoded.userId, name: decoded.name || decoded.userId, email: decoded.email, role: decoded.role }
      }));
    } catch (err) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: 'Invalid token' }));
    }

  } else if (req.method === 'POST' && req.url === '/api/auth/logout') {
    const cookieDomain = process.env.COOKIE_DOMAIN || '.bibliohispa.es';
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `BIBLIO_SSO_TOKEN=; Domain=${cookieDomain}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    });
    res.end(JSON.stringify({ success: true }));

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
