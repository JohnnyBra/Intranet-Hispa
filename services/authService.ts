import { User } from '../types';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export const loginWithGoogle = async (credential: string): Promise<User> => {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: credential })
  });

  // Verify content type is JSON
  const contentType = res.headers.get("content-type");
  let data;

  if (contentType && contentType.indexOf("application/json") !== -1) {
    try {
      data = await res.json();
    } catch (e) {
      console.error("JSON parsing error:", e);
      throw new Error("Respuesta inválida del servidor (JSON malformado).");
    }
  } else {
    // If not JSON, try to get text to debug (or just throw)
    const text = await res.text();
    console.error("Non-JSON response received:", text);
    throw new Error(`Error del servidor (${res.status}): La respuesta no es válida.`);
  }

  if (!res.ok) {
    throw new Error(data.message || 'Error al iniciar sesión.');
  }

  if (!data.success) {
      throw new Error(data.message || 'Error desconocido.');
  }

  // Devolvemos el usuario limpio
  return {
    email: data.email,
    name: data.name,
    avatar: data.avatar,
    role: data.role,
  };
};

export const checkSession = (): User | null => {
  const stored = localStorage.getItem('hispanidad_user');
  return stored ? JSON.parse(stored) : null;
};

export const logout = () => {
  localStorage.removeItem('hispanidad_user');
  if (typeof window !== 'undefined' && (window as any).google) {
    (window as any).google.accounts.id.disableAutoSelect();
  }
};
