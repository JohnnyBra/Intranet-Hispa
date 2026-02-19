import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SectionView } from './components/SectionView';
import { EventsView } from './components/EventsView';
import { Login } from './components/Login';
import { Logo } from './components/Logo';
import { User, NavItem, ThemeMode } from './types';
import { logout, checkSession } from './services/authService';
import { getNavItems, addNavItem } from './services/dataService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isNewSectionModalOpen, setIsNewSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Load Nav Items
  useEffect(() => {
    setNavItems(getNavItems());
  }, []);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
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

  // Session check
  useEffect(() => {
    const session = checkSession();
    if (session) setUser(session);
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
    localStorage.setItem('hispanidad_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const handleAddSection = () => {
    if (!newSectionName) return;
    const id = newSectionName.toLowerCase().replace(/\s+/g, '-');
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

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Sidebar 
        navItems={navItems}
        activePath={currentView}
        onNavigate={setCurrentView}
        user={user}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        theme={theme}
        setTheme={setTheme}
        onAddSection={() => setIsNewSectionModalOpen(true)}
      />

      {/* Main Content Wrapper - Shifts when sidebar opens */}
      <div 
        className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-72' : 'ml-0'}`}
      >
        {/* Universal Header (Mobile & Desktop) */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-0 md:opacity-0 hidden' : 'opacity-100'}`}>
                <Logo />
            </div>
          </div>
          
          {/* Header Actions (Optional spacer or other tools) */}
          <div className="w-8" />
        </div>

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