import { User } from '../types';

// Mocking the API response from prisma.bibliohispa.es (API: ojosyculos)
export const loginWithEmail = async (email: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Validation logic (Mock)
      if (email.endsWith('@bibliohispa.es') || email.endsWith('@colegiolahispanidad.es') || email.includes('@')) {
        
        let role: 'teacher' | 'admin' = 'teacher';
        
        // Admin check
        if (email === 'direccion@colegiolahispanidad.es') {
          role = 'admin';
        }

        // Success Mock
        resolve({
          email: email,
          name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          role: role,
          avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=${role === 'admin' ? '1e88e5' : 'e53935'}&color=fff`
        });
      } else {
        reject(new Error("Correo no autorizado en la lista de profesores."));
      }
    }, 1500); // Simulate network delay
  });
};

export const checkSession = (): User | null => {
  const stored = localStorage.getItem('hispanidad_user');
  return stored ? JSON.parse(stored) : null;
};

export const logout = () => {
  localStorage.removeItem('hispanidad_user');
};