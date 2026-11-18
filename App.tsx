import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SectionView } from './components/SectionView';
import { EventsView } from './components/EventsView';
import { AppsView } from './components/AppsView';
import { Login } from './components/Login';
import { User, NavItem, ThemeMode } from './types';
import { logout, checkSession, ADMIN_EMAIL } from './services/authService';
import { getNavItems, addNavItem, loadAllData } from './services/dataService';

const getSharedTheme = (): ThemeMode | null => {
  const m = document.cookie.match(/(?:^|;\s*)HISPA_THEME=([^;]+)/);
  const v = m?.[1];
  return (v === 'light' || v === 'dark' || v === 'system') ? v as ThemeMode : null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (!localStorage.getItem('intranet_theme_manual')) {
      const cookieTheme = getSharedTheme();
      if (cookieTheme) return cookieTheme;
    }
    const saved = localStorage.getItem('intranet_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved as ThemeMode;
    return 'system';
  });
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isNewSectionModalOpen, setIsNewSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load all shared data from server, then populate nav items
  useEffect(() => {
    loadAllData().then(() => {
      setNavItems(getNavItems());
      setIsDataLoaded(true);
    });
  }, []);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
      root.setAttribute('data-theme', isDark ? 'dark' : 'light'); // lo lee el kit de la Suite
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  // Re-sync from PrismaEdu cookie when tab regains focus (if no manual override)
  useEffect(() => {
    const syncFromCookie = () => {
      if (localStorage.getItem('intranet_theme_manual')) return;
      const cookieTheme = getSharedTheme();
      if (cookieTheme) setTheme(cookieTheme);
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') syncFromCookie(); };
    window.addEventListener('focus', syncFromCookie);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', syncFromCookie);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleSetTheme = (t: ThemeMode) => {
    localStorage.setItem('intranet_theme_manual', '1');
    localStorage.setItem('intranet_theme', t);
    setTheme(t);
  };

  // Session check
  useEffect(() => {
    const checkAuth = async () => {
      let localUser = checkSession();

      // Intentar SSO
      try {
        const res = await fetch('/api/proxy/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            localStorage.removeItem('intranet_theme_manual');
            const ssoUser: User = {
              email: data.user.email,
              name: data.user.name,
              role: (data.user.role === 'ADMIN' || data.user.email?.toLowerCase() === ADMIN_EMAIL) ? 'admin' : 'teacher'
            };
            setUser(ssoUser);
            localStorage.setItem('hispanidad_user', JSON.stringify(ssoUser));
            return;
          }
        }

        // El servidor respondió (401 u otro): sesión inválida → forzar login
        localStorage.removeItem('hispanidad_user');
        return;
      } catch (e) {
        // Error de red: usar datos locales como fallback temporal
        if (localUser) setUser(localUser);
        return;
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (user: User) => {
    localStorage.removeItem('intranet_theme_manual');
    setUser(user);
    localStorage.setItem('hispanidad_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const handleAddSection = () => {
    if (!newSectionName) return;
    const id = newSectionName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
    if (!id) return;
    const newItem: NavItem = {
      id: id,
      label: newSectionName,
      iconName: 'Folder',
      path: id
    };
    addNavItem(newItem);
    setNavItems(getNavItems()); // Refresh
    setIsNewSectionModalOpen(false);
    setNewSectionName('');
    setCurrentView(id); // Navigate to it
  };

  const renderContent = () => {
    if (currentView === 'dashboard') {
      return <Dashboard onNavigate={setCurrentView} currentUser={user} />;
    }

    if (currentView === 'fotos-eventos') {
      return <EventsView currentUser={user!} />;
    }

    if (currentView === 'aplicaciones') {
      return <AppsView currentUser={user!} />;
    }

    // Dynamic routing lookup
    // Flatten the nav tree to find if currentView matches any path
    const findPath = (items: NavItem[]): boolean => {
      for (const item of items) {
        if (item.path === currentView) return true;
        if (item.children && findPath(item.children)) return true;
      }
      return false;
    };

    if (findPath(navItems)) {
      return <SectionView key={currentView} sectionId={currentView} currentUser={user!} />;
    }

    return <Dashboard onNavigate={setCurrentView} currentUser={user} />;
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-4 border-hispa-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar
        navItems={navItems}
        activePath={currentView}
        onNavigate={setCurrentView}
        user={user}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onAddSection={() => setIsNewSectionModalOpen(true)}
      />

      {/* Main Content Wrapper - Shifts when sidebar opens */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-72' : 'ml-0'}`}
      >
        {/* Cabecera común de la Suite La Hispanidad (kit servido desde Prisma) */}
        <header className="hs-header z-30">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isSidebarOpen}
            >
              <Menu size={24} />
            </button>
            <a
              className="hs-marca"
              href="/"
              onClick={(e) => { e.preventDefault(); setCurrentView('dashboard'); }}
            >
              <img className="hs-escudo" src="https://prisma.bibliohispa.es/suite/escudo.png" alt="Colegio La Hispanidad" />
              <span>
                <span className="hs-marca-nombre">Intranet</span>
                <span className="hs-firma">Creado por Javi Barrero</span>
              </span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-200 dark:bg-zinc-800 rounded-lg p-0.5" role="group" aria-label="Tema">
              <button
                onClick={() => handleSetTheme('light')}
                className={`flex justify-center p-1.5 rounded-md text-sm transition-colors ${theme === 'light' ? 'bg-white text-[#0a4a8c] dark:text-sky-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                title="Modo claro"
                aria-label="Modo claro"
                aria-pressed={theme === 'light'}
              >
                <Sun size={14} />
              </button>
              <button
                onClick={() => handleSetTheme('system')}
                className={`flex justify-center p-1.5 rounded-md text-sm transition-colors ${theme === 'system' ? 'bg-white dark:bg-zinc-700 text-[#0a4a8c] dark:text-sky-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                title="Automático"
                aria-label="Automático"
                aria-pressed={theme === 'system'}
              >
                <Monitor size={14} />
              </button>
              <button
                onClick={() => handleSetTheme('dark')}
                className={`flex justify-center p-1.5 rounded-md text-sm transition-colors ${theme === 'dark' ? 'bg-white dark:bg-zinc-700 text-[#0a4a8c] dark:text-sky-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                title="Modo oscuro"
                aria-label="Modo oscuro"
                aria-pressed={theme === 'dark'}
              >
                <Moon size={14} />
              </button>
            </div>
            <a href="https://prisma.bibliohispa.es" className="hs-boton hs-boton--suave" title="Ir al Portal Prisma">
              <span className="hs-prisma" style={{ '--t': '18px' } as React.CSSProperties} aria-hidden="true" />
              <span className="hidden sm:inline">Prisma</span>
              <span className="sr-only sm:hidden">Ir a Prisma</span>
            </a>
          </div>
        </header>

        <main className="p-0 min-h-[calc(100vh-64px)]">
          {renderContent()}
        </main>
      </div>

      {/* New Section Modal */}
      {isNewSectionModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Nueva Sección</h3>
            <input
              autoFocus
              className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-2 mb-4 dark:bg-zinc-800 dark:text-white"
              placeholder="Nombre del apartado (ej: Robótica)"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsNewSectionModalOpen(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
              <button onClick={handleAddSection} className="px-4 py-2 bg-hispa-red text-white rounded-lg">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;