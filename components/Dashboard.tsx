import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, BookOpen, Users, Brain, GraduationCap, FileText, Image, Folder } from 'lucide-react';
import { getNavItems, getEvents } from '../services/dataService';
import { NavItem, Photo } from '../types';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

const QuickCard: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  image: string; 
  onClick: () => void;
  color: string;
}> = ({ title, icon, image, onClick, color }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="relative overflow-hidden rounded-2xl cursor-pointer group h-48 shadow-lg bg-white dark:bg-zinc-800"
  >
    <div className="absolute inset-0">
      <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
    </div>
    
    <div className="absolute bottom-0 left-0 p-6 w-full">
      <div className={`inline-flex items-center justify-center p-2 rounded-lg bg-white/10 backdrop-blur-md mb-3 text-${color}-400`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white group-hover:text-gray-100 transition-colors">
        {title}
      </h3>
    </div>
  </motion.div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [dynamicSections, setDynamicSections] = useState<NavItem[]>([]);
  const [randomPhotos, setRandomPhotos] = useState<Photo[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    // 1. Load Dynamic Sections
    const allItems = getNavItems();
    // Filter out items that are already hardcoded in the main grid
    const excludedIds = ['inicio', 'aulas', 'formacion', 'recursos', 'ia', 'claustro', 'fotos']; 
    const custom = allItems.filter(item => !excludedIds.includes(item.id));
    setDynamicSections(custom);

    // 2. Load Photos for Carousel
    const events = getEvents();
    if (events.length > 0) {
        // Flatten all photos from all folders in all events
        const allPhotos: Photo[] = events.flatMap(e => e.folders.flatMap(f => f.photos));
        // Shuffle and pick 5
        const shuffled = allPhotos.sort(() => 0.5 - Math.random()).slice(0, 5);
        setRandomPhotos(shuffled);
    }
  }, []);

  // Carousel Auto-Play
  useEffect(() => {
    if (randomPhotos.length <= 1) return;
    const timer = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % randomPhotos.length);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(timer);
  }, [randomPhotos]);

  return (
    <div className="p-4 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden min-h-[350px] md:min-h-[400px] flex items-center justify-center text-center shadow-2xl"
      >
        <div className="absolute inset-0 z-0">
           <img src="https://picsum.photos/id/1031/1600/600" alt="Colegio La Hispanidad" className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-gradient-to-r from-hispa-red/80 to-hispa-blue/60 mix-blend-multiply" />
           <div className="absolute inset-0 bg-black/30" />
        </div>

        <div className="relative z-10 p-8 max-w-3xl">
          <div className="inline-block px-4 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white text-sm font-medium mb-6 animate-pulse">
            Curso 2025 - 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">
            COLEGIO <br/> LA HISPANIDAD
          </h1>
          <div className="h-1 w-32 bg-hispa-red mx-auto mb-6 rounded-full shadow-lg"></div>
          <p className="text-lg md:text-xl text-gray-100 font-light max-w-2xl mx-auto">
            Bienvenidos a la intranet del profesorado. Un espacio para compartir, aprender y crecer juntos.
          </p>
        </div>
      </motion.div>

      {/* Main Access Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <GraduationCap className="text-hispa-red" />
            Accesos Directos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickCard 
            title="Reserva de Aulas" 
            icon={<ExternalLink className="text-white" />}
            color="blue"
            image="https://picsum.photos/id/201/500/300" 
            onClick={() => window.open('https://aulas.bibliohispa.es', '_blank')}
            />
            <QuickCard 
            title="Formación" 
            icon={<BookOpen className="text-white" />} 
            color="green"
            image="https://picsum.photos/id/3/500/300"
            onClick={() => onNavigate('formacion')}
            />
            <QuickCard 
            title="Recursos Didácticos" 
            icon={<Users className="text-white" />} 
            color="yellow"
            image="https://picsum.photos/id/366/500/300"
            onClick={() => onNavigate('recursos-generales')}
            />
            <QuickCard 
            title="IA en Educación" 
            icon={<Brain className="text-white" />} 
            color="purple"
            image="https://picsum.photos/id/60/500/300"
            onClick={() => onNavigate('ia-educacion')}
            />
            {/* Claustro Virtual (Linked to Documentos Profesorado) */}
            <QuickCard 
            title="Claustro Virtual" 
            icon={<FileText className="text-white" />} 
            color="red"
            image="https://picsum.photos/id/453/500/300"
            onClick={() => onNavigate('documentos-profesorado')}
            />
            <QuickCard 
            title="Fotos de Eventos" 
            icon={<Image className="text-white" />} 
            color="pink"
            image="https://picsum.photos/id/450/500/300"
            onClick={() => onNavigate('fotos-eventos')}
            />
        </div>
      </div>

      {/* Dynamic Sections (Created by Admin) */}
      {dynamicSections.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Folder className="text-hispa-blue" />
                Otras Secciones
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dynamicSections.map(section => (
                    <motion.div
                        key={section.id}
                        whileHover={{ y: -5 }}
                        onClick={() => onNavigate(section.path || '')}
                        className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-zinc-700 cursor-pointer hover:border-hispa-blue transition-colors flex flex-col items-center text-center gap-3"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-hispa-blue dark:text-blue-300">
                            <Folder size={24} />
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">{section.label}</h3>
                    </motion.div>
                ))}
            </div>
          </div>
      )}

      {/* Photo Carousel */}
      {randomPhotos.length > 0 && (
          <div>
             <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Image className="text-orange-500" />
                Galería Reciente
            </h2>
            <div className="relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden shadow-xl bg-black">
                <AnimatePresence mode='wait'>
                    <motion.img 
                        key={currentPhotoIndex}
                        src={randomPhotos[currentPhotoIndex].url}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 w-full h-full object-contain md:object-cover"
                    />
                </AnimatePresence>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                    <div>
                        <p className="text-white font-medium text-sm">Recuerdo de Evento</p>
                        <p className="text-white/60 text-xs">Subida por {randomPhotos[currentPhotoIndex].uploadedBy} · {randomPhotos[currentPhotoIndex].date}</p>
                    </div>
                    <button 
                        onClick={() => onNavigate('fotos-eventos')}
                        className="text-xs bg-white/20 hover:bg-white/30 backdrop-blur text-white px-3 py-1 rounded-full transition-colors"
                    >
                        Ver todas
                    </button>
                </div>
            </div>
          </div>
      )}

      {/* Call to Action */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-hispa-blue dark:text-blue-300">¿Tienes un recurso interesante?</h4>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Comparte tus materiales didácticos con el resto de compañeros para enriquecer el aprendizaje.</p>
        </div>
        <button onClick={() => onNavigate('recursos-generales')} className="px-6 py-2 bg-hispa-blue hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors whitespace-nowrap">
          Subir Recurso
        </button>
      </div>
    </div>
  );
};