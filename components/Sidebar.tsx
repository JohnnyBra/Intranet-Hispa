import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Menu, X, LogOut, Sun, Moon, Monitor, Plus, Home, Layout, BookOpen, GraduationCap, Brain, Folder, PanelLeftClose, FileText, LayoutGrid } from 'lucide-react';
import { NavItem, User, ThemeMode } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  navItems: NavItem[];
  activePath: string;
  onNavigate: (path: string) => void;
  user: User | null;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onAddSection?: () => void;
}

// Map string icon names to components
const IconMap: Record<string, React.ReactNode> = {
  'Home': <Home size={20} />,
  'Layout': <Layout size={20} />,
  'BookOpen': <BookOpen size={20} />,
  'GraduationCap': <GraduationCap size={20} />,
  'Brain': <Brain size={20} />,
  'Folder': <Folder size={20} />,
  'FileText': <FileText size={20} />
};

const NavItemComponent: React.FC<{
  item: NavItem;
  activePath: string;
  onNavigate: (path: string) => void;
  depth?: number;
}> = ({ item, activePath, onNavigate, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = activePath === item.path || (item.children && item.children.some(c => activePath.startsWith(c.path || '')));
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else if (item.externalUrl) {
      window.open(item.externalUrl, '_blank');
    } else if (item.path) {
      onNavigate(item.path);
    }
  };

  const icon = item.iconName ? IconMap[item.iconName] || <Folder size={20} /> : <Folder size={20} />;

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        className={`
          flex items-center justify-between py-2 px-3 my-1 rounded-lg cursor-pointer transition-all duration-200
          ${isActive && !hasChildren ? 'bg-hispa-red/10 text-hispa-red font-medium border-l-4 border-hispa-red' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}
          ${depth > 0 ? 'ml-4 text-sm' : ''}
        `}
      >
        <div className="flex items-center gap-3">
          <span className={`${isActive ? 'text-hispa-red' : 'text-gray-400'}`}>{icon}</span>
          <span>{item.label}</span>
        </div>
        {hasChildren && (
          <span className="text-gray-400">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}
      </div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.id}
                item={child}
                activePath={activePath}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  navItems, activePath, onNavigate, user, onLogout, isOpen, setIsOpen, theme, setTheme, onAddSection
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        className={`fixed top-0 left-0 z-50 h-screen bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 w-72 shadow-2xl flex flex-col`}
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="p-6 flex items-center justify-between">
            <Logo />
            <button onClick={() => setIsOpen(false)} className="p-1 text-gray-500 hover:text-hispa-red transition-colors">
                <PanelLeftClose size={20} />
            </button>
        </div>

        <div className="px-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Menu</div>
          {navItems.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
              activePath={activePath}
              onNavigate={(path) => {
                onNavigate(path);
                if (window.innerWidth < 768) setIsOpen(false);
              }}
            />
          ))}

          {/* Admin Add Section Button */}
          {user?.role === 'admin' && onAddSection && (
             <button 
                onClick={onAddSection}
                className="w-full mt-4 flex items-center gap-3 py-2 px-3 rounded-lg text-gray-500 hover:text-hispa-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-dashed border-gray-300 dark:border-zinc-700 transition-colors"
             >
                <Plus size={20} />
                <span className="text-sm font-medium">Nueva Sección</span>
             </button>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
          
          {/* User Profile */}
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={user?.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
            <div className="overflow-hidden">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                  {user?.role === 'admin' && <span className="w-2 h-2 rounded-full bg-hispa-blue"></span>}
                  {user?.role === 'admin' ? 'Administrador' : 'Docente'}
                </p>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex bg-gray-200 dark:bg-zinc-800 rounded-lg p-1 mb-3">
             <button 
                onClick={() => setTheme('light')}
                className={`flex-1 flex justify-center p-1.5 rounded-md text-sm ${theme === 'light' ? 'bg-white text-hispa-red shadow-sm' : 'text-gray-500'}`}
             >
                <Sun size={16} />
             </button>
             <button 
                onClick={() => setTheme('system')}
                className={`flex-1 flex justify-center p-1.5 rounded-md text-sm ${theme === 'system' ? 'bg-white dark:bg-zinc-700 text-hispa-red shadow-sm' : 'text-gray-500'}`}
             >
                <Monitor size={16} />
             </button>
             <button 
                onClick={() => setTheme('dark')}
                className={`flex-1 flex justify-center p-1.5 rounded-md text-sm ${theme === 'dark' ? 'bg-zinc-700 text-hispa-red shadow-sm' : 'text-gray-500'}`}
             >
                <Moon size={16} />
             </button>
          </div>

          <a href="https://prisma.bibliohispa.es"
             className="w-full flex items-center justify-center gap-2 p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors font-medium mb-2"
             title="Ir al Portal Prisma">
            <LayoutGrid size={16} />
            <span>Prisma</span>
          </a>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
};