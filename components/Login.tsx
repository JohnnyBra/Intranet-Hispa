import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Logo } from './Logo';

interface LoginProps {
  onLogin: (email: string) => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await onLogin(email);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         {/* Updated colors for background blobs to match new blue theme */}
         <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-hispa-red/10 rounded-full blur-3xl animate-pulse"></div>
         <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] bg-hispa-blue/10 rounded-full blur-3xl"></div>
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

        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">Bienvenido, Docente</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Introduce tu correo corporativo para acceder a la intranet.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Correo Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="email" 
                required
                placeholder="usuario@bibliohispa.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-hispa-red focus:border-transparent outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-hispa-red to-hispa-darkRed hover:from-hispa-darkRed hover:to-hispa-red text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <><span>Acceder</span> <ArrowRight size={20} /></>}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Acceso protegido por prisma.bibliohispa.es</p>
          <p className="mt-1">API: ojosyculos v1.0</p>
        </div>
      </motion.div>
    </div>
  );
};