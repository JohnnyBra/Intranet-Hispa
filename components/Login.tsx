import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { loginWithGoogle, GOOGLE_CLIENT_ID } from '../services/authService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Usamos un ref para el callback para evitar closures obsoletas con la librería de Google
  const handleResponseRef = useRef<(response: { credential: string }) => void>();
  handleResponseRef.current = async (response) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await loginWithGoogle(response.credential);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initGSI = () => {
      const g = (window as any).google;
      if (!g || !buttonRef.current) return;

      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res: { credential: string }) => handleResponseRef.current?.(res),
        hosted_domain: 'colegiolahispanidad.es',
      });

      g.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        locale: 'es',
        width: 340,
      });
    };

    if ((window as any).google) {
      initGSI();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGSI;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4 relative overflow-hidden">

      {/* Decoración de fondo */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-hispa-red/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] bg-hispa-blue/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border border-gray-100 dark:border-zinc-800"
      >
        <div className="flex justify-center mb-8">
          <Logo className="scale-125" />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
          Bienvenido, Docente
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
          Accede con tu cuenta corporativa{' '}
          <span className="font-semibold text-hispa-red">@colegiolahispanidad.es</span>
        </p>

        <div className="flex flex-col items-center gap-4">
          {/* El div siempre está en el DOM para que Google pueda inyectar el iframe del botón */}
          <div
            ref={buttonRef}
            className={`w-full flex justify-center transition-opacity duration-300 ${
              isLoading ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : 'opacity-100'
            }`}
          />

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-gray-500 py-3"
            >
              <Loader2 className="animate-spin" size={22} />
              <span className="text-sm">Verificando acceso...</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="w-full flex items-start gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={14} />
          <p>Acceso verificado mediante prisma.bibliohispa.es</p>
        </div>
      </motion.div>
    </div>
  );
};
