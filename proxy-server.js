import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { io as ClientIO } from 'socket.io-client';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3011; // Mantener puerto original del proxy

// Configuración
const EXTERNAL_SOCKET_URL = process.env.PRISMA_API_URL || 'https://prisma.bibliohispa.es';
const API_KEY = process.env.PRISMA_API_KEY || 'ojosyculos';
const ALLOWED_DOMAIN = 'colegiolahispanidad.es';
const ADMIN_EMAIL = 'direccion@colegiolahispanidad.es';

// Cache en memoria
let usersMemoryCache = [];
let usersEmailMap = new Map();

// Helper para actualizar el mapa de emails
const updateUsersMap = () => {
    usersEmailMap.clear();
    usersMemoryCache.forEach(u => {
        if (u.email) usersEmailMap.set(u.email.toLowerCase(), u);
    });
};

const appRoleMap = {
  'ADMIN': 'admin', 'ADMINISTRADOR': 'admin', 'DIRECCION': 'admin', 'DIRECTOR': 'admin', 'JEFATURA': 'admin',
  'TUTOR': 'teacher', 'PROFESOR': 'teacher', 'DOCENTE': 'teacher', 'MAESTRO': 'teacher', 'USER': 'teacher', 'ORIENTADOR': 'teacher'
};

const processExternalUsers = (externalUsers) => {
    if (!Array.isArray(externalUsers)) return;

    console.log(`🔄 [SYNC] Procesando ${externalUsers.length} usuarios recibidos.`);

    const allowedTeachers = [];

    for (const u of externalUsers) {
      const rawRole = (u.role || u.rol || '').toString().toUpperCase().trim();

      // Mapear roles
      let appRole = appRoleMap[rawRole];

      // Inferencia básica si no está en el mapa
      if (!appRole) {
          if (rawRole.includes('ADMIN') || rawRole.includes('DIRECTOR')) appRole = 'admin';
          else if (rawRole === 'TUTOR') appRole = 'teacher';
      }

      // Si no tiene rol válido, saltar
      if (!appRole) continue;

      let finalEmail = u.email || u.correo || u.mail || u.id;

      // Corrección de emails sin dominio
      if (finalEmail && !finalEmail.toString().includes('@') && u.id) {
          finalEmail = `${u.id}@${ALLOWED_DOMAIN}`;
      }

      if (finalEmail) {
          const userObj = {
            id: u.id || finalEmail,
            name: u.name || u.nombre || u.full_name || u.nombre_completo || 'Usuario',
            email: finalEmail.toLowerCase().trim(),
            role: appRole,
            avatar: u.avatar || u.foto || null
          };
          allowedTeachers.push(userObj);
      }
    }

    if (allowedTeachers.length > 0) {
        allowedTeachers.sort((a, b) => a.name.localeCompare(b.name));
        usersMemoryCache = allowedTeachers;
        updateUsersMap();
        console.log(`✅ [SYNC] Cache actualizado: ${usersMemoryCache.length} usuarios.`);
    }
};

// --- Socket Client ---
let prismaSocket = null;

const startPrismaSocket = () => {
    console.log(`🔄 [SOCKET] Iniciando conexión a ${EXTERNAL_SOCKET_URL}`);
    prismaSocket = ClientIO(EXTERNAL_SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 5000
    });

    prismaSocket.on('connect', () => {
         console.log('✅ [SOCKET] Conectado a Prisma Edu');
    });

    prismaSocket.on('init_state', (data) => {
         console.log('📦 [SOCKET] Recibido estado inicial');
         if (data.users) processExternalUsers(data.users);
    });

    prismaSocket.on('sync_users', (users) => {
         console.log('🔄 [SOCKET] Actualización de usuarios recibida');
         processExternalUsers(users);
    });

    prismaSocket.on('disconnect', () => {
         console.log('⚠️ [SOCKET] Desconectado de Prisma Edu');
    });

    prismaSocket.on('connect_error', (err) => {
         console.error(`❌ [SOCKET] Error de conexión: ${err.message}`);
    });
};

// Iniciar sincronización
startPrismaSocket();

// --- Express Server ---
app.use(cors());
app.use(express.json());

// Endpoint de Login con Google
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token requerido' });

  try {
    // 1. Verificar token con Google
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);

    if (!googleRes.ok) {
        return res.status(401).json({ success: false, message: 'Token de Google inválido' });
    }

    const payload = await googleRes.json();
    const email = payload.email.toLowerCase();

    // 2. Verificar dominio (opcional, pero buena práctica)
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return res.status(403).json({ success: false, message: `Solo se permite el acceso con cuentas @${ALLOWED_DOMAIN}` });
    }

    // 3. Buscar usuario en cache local
    let user = usersEmailMap.get(email);

    // Fallback: Si no está en cache (ej: arranque reciente), intentar fetch directo a Prisma
    // Esto mitiga el problema de "cache vacío al inicio"
    if (!user) {
        console.log(`⚠️ Usuario ${email} no encontrado en cache, intentando fetch directo...`);
        try {
            const upstreamResponse = await fetch(`${EXTERNAL_SOCKET_URL}/api/export/users`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'api_secret': API_KEY,
                    'x-api-secret': API_KEY
                }
            });
            if (upstreamResponse.ok) {
                const data = await upstreamResponse.json();
                const usersList = Array.isArray(data) ? data : (data.users || []);
                processExternalUsers(usersList); // Actualizar cache
                user = usersEmailMap.get(email); // Reintentar búsqueda
            }
        } catch (err) {
            console.error("Error en fetch directo:", err);
        }
    }

    if (user) {
        // Asegurar que el avatar venga de Google si no lo tenemos, o preferirlo
        const finalUser = {
            ...user,
            avatar: payload.picture || user.avatar
        };

        // Forzar admin si es el email maestro
        if (email === ADMIN_EMAIL) finalUser.role = 'admin';

        return res.json({ success: true, ...finalUser });
    }

    return res.status(403).json({
        success: false,
        message: 'Tu cuenta no figura en la lista de profesores autorizados.'
    });

  } catch (e) {
      console.error("Error en login:", e);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint Legacy para compatibilidad (devuelve JSON de usuarios)
// Ahora se sirve desde memoria, mucho más rápido y sin 502 por timeouts externos
app.get('/api/prisma-users', (req, res) => {
    res.json(usersMemoryCache);
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Proxy Server escuchando en http://127.0.0.1:${PORT}`);
});
