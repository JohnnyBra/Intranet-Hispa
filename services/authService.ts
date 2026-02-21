import { User } from '../types';

const ALLOWED_DOMAIN = 'colegiolahispanidad.es';
const ADMIN_EMAIL = 'direccion@colegiolahispanidad.es';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

/**
 * Verifica el token de Google contra la API oficial de Google.
 * Valida la firma del JWT sin necesidad de backend propio.
 */
const verifyGoogleToken = async (credential: string) => {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
  );
  if (!res.ok) {
    throw new Error('Token de Google inválido o caducado. Inténtalo de nuevo.');
  }
  return res.json() as Promise<{
    email: string;
    name: string;
    picture: string;
    sub: string;
    hd?: string;
  }>;
};

/**
 * Obtiene la lista de emails autorizados a través del proxy local (/api/prisma-users).
 * En dev: Vite proxy → prisma.bibliohispa.es
 * En prod: nginx proxy → prisma.bibliohispa.es
 * La API key nunca sale del bundle del cliente.
 */
const fetchAuthorizedEmails = async (): Promise<string[]> => {
  const res = await fetch('/api/prisma-users');

  if (!res.ok) {
    throw new Error(`Error al conectar con el servidor de autenticación (${res.status})`);
  }

  const data = await res.json();
  const list: any[] = Array.isArray(data) ? data : (data.users ?? data.data ?? []);
  return list.map((u: any) => String(u.email).toLowerCase());
};

export const loginWithGoogle = async (credential: string): Promise<User> => {
  // 1. Verificar firma del token con Google
  const payload = await verifyGoogleToken(credential);

  // 2. Verificar dominio corporativo
  const email = payload.email.toLowerCase();
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`Solo se permite el acceso con cuentas @${ALLOWED_DOMAIN}`);
  }

  // 3. Verificar contra la lista de profesores de Prisma
  const authorizedEmails = await fetchAuthorizedEmails();
  if (!authorizedEmails.includes(email)) {
    throw new Error(
      'Tu cuenta no figura en la lista de profesores autorizados. Contacta con la dirección del centro.'
    );
  }

  // 4. Determinar rol
  const role: 'teacher' | 'admin' = email === ADMIN_EMAIL ? 'admin' : 'teacher';

  return {
    email: payload.email,
    name: payload.name,
    avatar: payload.picture,
    role,
  };
};

export const loginWithPin = async (pin: string): Promise<User> => {
  const res = await fetch('/api/prisma-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_EMAIL, password: pin }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'PIN incorrecto.');
  }

  return {
    email: ADMIN_EMAIL,
    name: data.name || 'Dirección',
    role: 'admin',
  };
};

export const checkSession = (): User | null => {
  const stored = localStorage.getItem('hispanidad_user');
  return stored ? JSON.parse(stored) : null;
};

export const logout = () => {
  localStorage.removeItem('hispanidad_user');
  fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  if (typeof window !== 'undefined' && (window as any).google) {
    (window as any).google.accounts.id.disableAutoSelect();
  }
};
