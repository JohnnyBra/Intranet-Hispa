import { User } from '../types';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export const loginWithGoogle = async (credential: string): Promise<User> => {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: credential })
  });

  const data = await res.json();

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
