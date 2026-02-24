/**
 * One-time script to obtain a Google Drive OAuth2 refresh token.
 *
 * Prerequisites:
 *   1. Set GOOGLE_CLIENT_SECRET in .env.local
 *   2. In Google Cloud Console > APIs & Services > Credentials > tu OAuth Client ID,
 *      añade http://localhost:3099 en "Authorized redirect URIs" (NO en JavaScript origins).
 *      Nota: puede tardar 5 min en propagarse.
 *
 * Usage:
 *   node drive-auth-setup.js
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import http from 'http';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3099';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env.local\n');
  console.error('Añade esta línea a .env.local:');
  console.error('  GOOGLE_CLIENT_SECRET=tu-client-secret\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
  login_hint: 'eventos@colegiolahispanidad.es',
});

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   Google Drive OAuth2 — Obtener Refresh Token   ║');
console.log('╚══════════════════════════════════════════════════╝\n');
console.log('IMPORTANTE: En Google Cloud Console, asegúrate de tener');
console.log('esta URI en "Authorized redirect URIs" (NO en JavaScript origins):');
console.log(`  → ${REDIRECT_URI}\n`);
console.log('Abriendo navegador...\n');

// Try to open the browser
try {
  const { exec } = await import('child_process');
  exec(`start "${authUrl}"`);
} catch {}

console.log('Si no se abre automáticamente, copia esta URL:\n');
console.log(authUrl);
console.log('\nEsperando respuesta en http://localhost:3099 ...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3099');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2 style="color:red">Error: ${error}</h2><p>Cierra esta pestaña e intenta de nuevo.</p>`);
    console.error(`\n❌ Error: ${error}`);
    setTimeout(() => process.exit(1), 500);
    return;
  }

  if (!code) {
    // Probably favicon or other request, ignore
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2 style="color:red">No se recibió refresh token</h2><p>Intenta revocar el acceso en <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a> y ejecuta el script de nuevo.</p>`);
      console.error('\n❌ No refresh token received. Revoca el acceso previo e intenta de nuevo.');
      setTimeout(() => process.exit(1), 500);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <div style="font-family:sans-serif;max-width:600px;margin:40px auto;text-align:center">
        <h2 style="color:green">✅ Autorización completada</h2>
        <p>Refresh token obtenido. Puedes cerrar esta pestaña.</p>
        <p style="margin-top:20px">Añade esta línea a <code>.env.local</code>:</p>
        <pre style="background:#f0f0f0;padding:12px;border-radius:8px;word-break:break-all;text-align:left;font-size:13px">GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}</pre>
      </div>
    `);

    console.log('\n✅ ¡ÉXITO!\n');
    console.log('Añade esta línea a .env.local:\n');
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}\n`);

    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2 style="color:red">Error al obtener tokens</h2><pre>${err.message}</pre>`);
    console.error('\n❌ Error:', err.message);
    setTimeout(() => process.exit(1), 500);
  }
});

server.listen(3099, () => {
  console.log('Servidor escuchando en puerto 3099...');
});
