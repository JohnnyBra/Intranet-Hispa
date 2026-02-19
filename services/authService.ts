import { User } from '../types';

const ALLOWED_DOMAIN = 'colegiolahispanidad.es';
const ADMIN_EMAIL = 'direccion@colegiolahispanidad.es';

// Variables de entorno (definidas en .env.local)
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const PRISMA_API_URL = import.meta.env.VITE_PRISMA_API_URL as string;
const PRISMA_API_KEY = import.meta.env.VITE_PRISMA_API_KEY as string;

interface GoogleJwtPayload {
  email: string;
  name: string;
  picture: string;
  sub: string;
  hd?: string; // hosted domain (Google Workspace)
}

/** Decodifica el payload del JWT de Google sin verificar firma (la verificación la hace Google). */
const decodeJwt = (token: string): GoogleJwtPayload => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
};

/**
 * Obtiene la lista de emails autorizados desde la API de Prisma.
 * La API devuelve un array de objetos con al menos el campo `email`.
 * Si el formato de respuesta es diferente, ajusta el mapeo aquí.
 */
const fetchAuthorizedEmails = async (): Promise<string[]> => {
  const res = await fetch(PRISMA_API_URL, {
    headers: {
      'Authorization': `Bearer ${PRISMA_API_KEY}`,
      'x-api-key': PRISMA_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Error al conectar con el servidor de autenticación (${res.status})`);
  }

  const data = await res.json();

  // Soporta tanto array raíz como { users: [...] } o { data: [...] }
  const list: any[] = Array.isArray(data) ? data : (data.users ?? data.data ?? []);
  return list.map((u: any) => String(u.email).toLowerCase());
};

/**
 * Valida el credential de Google, comprueba el dominio y la lista de Prisma,
 * y devuelve el objeto User si todo es correcto.
 */
export const loginWithGoogle = async (credential: string): Promise<User> => {
  const payload = decodeJwt(credential);

  // 1. Verificar dominio corporativo
  if (!payload.email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`Solo se permite el acceso con cuentas @${ALLOWED_DOMAIN}`);
  }

  // 2. Verificar que el email está en la lista de profesores de Prisma
  const authorizedEmails = await fetchAuthorizedEmails();
  if (!authorizedEmails.includes(payload.email.toLowerCase())) {
    throw new Error('Tu cuenta no figura en la lista de profesores autorizados. Contacta con la dirección del centro.');
  }

  // 3. Determinar rol
  const role: 'teacher' | 'admin' =
    payload.email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'teacher';

  return {
    email: payload.email,
    name: payload.name,
    avatar: payload.picture,
    role,
  };
};

export const checkSession = (): User | null => {
  const stored = localStorage.getItem('hispanidad_user');
  return stored ? JSON.parse(stored) : null;
};

export const logout = () => {
  localStorage.removeItem('hispanidad_user');
  // Desactiva la sesión de Google para evitar auto-login en el próximo acceso
  if (typeof window !== 'undefined' && (window as any).google) {
    (window as any).google.accounts.id.disableAutoSelect();
  }
};
