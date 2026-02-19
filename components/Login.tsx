import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
import { loginWithGoogle, loginWithPin, GOOGLE_CLIENT_ID } from '../services/authService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'google' | 'pin'>('google');
  const [pin, setPin] = useState('');
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
    if (mode !== 'google') return;

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
  }, [mode]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setIsLoading(true);
    setError(null);
    try {
      const user = await loginWithPin(pin);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'PIN incorrecto. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'google' | 'pin') => {
    setMode(newMode);
    setError(null);
    setPin('');
  };

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

        <AnimatePresence mode="wait">
          {mode === 'google' ? (
            <motion.div
              key="google"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
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

              <div className="mt-8 text-center">
                <button
                  onClick={() => switchMode('pin')}
                  className="text-xs text-gray-400 hover:text-hispa-red dark:hover:text-hispa-blue transition-colors underline underline-offset-2"
                >
                  Acceso Dirección (PIN)
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => switchMode('google')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  aria-label="Volver"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Acceso Dirección
                </h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm ml-8">
                Introduce tu PIN de Prisma para acceder como administrador.
              </p>

              <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="PIN de Prisma"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hispa-red/40 dark:focus:ring-hispa-blue/40 transition text-center text-lg tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !pin}
                  className="w-full py-3 rounded-xl bg-hispa-red text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>

              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 flex items-start gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={14} />
          <p>Acceso verificado mediante prisma.bibliohispa.es</p>
        </div>
      </motion.div>
    </div>
  );
};
