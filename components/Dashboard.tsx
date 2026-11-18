import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Pencil, ImagePlus } from 'lucide-react';
import { getNavItems, getEvents, getDashboardImages, removeDashboardImage } from '../services/dataService';
import { ImageEditModal, ImageEditTarget } from './ImageEditModal';
import { NavItem, Photo, User } from '../types';

interface DashboardProps {
  onNavigate: (path: string) => void;
  currentUser?: User | null;
}

// ── Default fallback images ──────────────────────────────────────────────────
const DEFAULT_IMAGES: Record<string, string> = {
  hero: 'https://picsum.photos/id/1031/1600/600',
  'card-aulas': 'https://picsum.photos/id/201/500/300',
  'card-formacion': 'https://picsum.photos/id/3/500/300',
  'card-recursos': 'https://picsum.photos/id/366/500/300',
  'card-ia': 'https://picsum.photos/id/60/500/300',
  'card-claustro': 'https://picsum.photos/id/453/500/300',
  'card-fotos': 'https://picsum.photos/id/450/500/300',
  'card-aplicaciones': 'https://picsum.photos/id/0/500/300',
};

// ── QuickCard ────────────────────────────────────────────────────────────────
const QuickCard: React.FC<{
  title: string;
  icon?: React.ReactNode;
  image: string;
  onClick: () => void;
  color: string;
  onEditImage?: () => void;
}> = ({ title, image, onClick, onEditImage }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="relative overflow-hidden rounded-2xl cursor-pointer group h-48 shadow-lg bg-white dark:bg-zinc-800"
  >
    <div className="absolute inset-0">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
    </div>

    {onEditImage && (
      <button
        onClick={e => { e.stopPropagation(); onEditImage(); }}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all backdrop-blur-sm"
        title="Cambiar imagen"
      >
        <Pencil size={14} />
      </button>
    )}

    <div className="absolute bottom-0 left-0 p-6 w-full">
      <h3 className="text-xl font-bold text-white group-hover:text-gray-100 transition-colors">
        {title}
      </h3>
    </div>
  </motion.div>
);

// ── Dashboard ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';

  const [dynamicSections, setDynamicSections] = useState<NavItem[]>([]);
  const [randomPhotos, setRandomPhotos] = useState<Photo[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [images, setImages] = useState<Record<string, string>>(DEFAULT_IMAGES);

  // Editor de imágenes (tarjetas, banner y portadas de las secciones)
  const [editing, setEditing] = useState<ImageEditTarget | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Custom images
    const stored = getDashboardImages();
    setImages({
      ...DEFAULT_IMAGES,
      ...(stored.hero ? { hero: stored.hero } : {}),
      ...stored.cards,
    });

    // Nav sections
    const excludedIds = ['inicio', 'aulas', 'formacion', 'recursos', 'ia', 'claustro', 'fotos', 'aplicaciones'];
    setDynamicSections(getNavItems().filter(item => !excludedIds.includes(item.id)));

    // Photos carousel
    const events = getEvents();
    if (events.length > 0) {
      const all = events.flatMap(e => e.folders.flatMap(f => f.photos));
      setRandomPhotos(all.sort(() => 0.5 - Math.random()).slice(0, 5));
    }
  }, []);

  useEffect(() => {
    if (randomPhotos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % randomPhotos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [randomPhotos]);

  // Shorthand: returns edit handler only for admins
  const editBtn = (key: string, w: number, h: number, label = 'Tarjeta de acceso') =>
    isAdmin ? () => setEditing({ key, w, h, label }) : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 space-y-10 max-w-7xl mx-auto">

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden min-h-[350px] md:min-h-[400px] flex items-center justify-center text-center shadow-2xl group"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={images.hero}
            alt="Colegio La Hispanidad"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-hispa-red/80 to-hispa-blue/60 mix-blend-multiply" />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {isAdmin && (
          <button
            onClick={() => setEditing({ key: 'hero', w: 1200, h: 400, label: 'Banner principal' })}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all backdrop-blur-sm"
            title="Cambiar imagen"
          >
            <Pencil size={14} />
          </button>
        )}

        <div className="relative z-10 p-8 max-w-3xl">
          <div className="inline-block px-4 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white text-sm font-medium mb-6 animate-pulse">
            Curso 2025 - 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">
            COLEGIO <br /> LA HISPANIDAD
          </h1>
          <div className="h-1 w-32 bg-hispa-red mx-auto mb-6 rounded-full shadow-lg" />
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
            color="blue"
            image={images['card-aulas']}
            onClick={() => window.open('https://aulas.bibliohispa.es', '_blank')}
            onEditImage={editBtn('card-aulas', 500, 300)}
          />
          <QuickCard
            title="Formación"
            color="green"
            image={images['card-formacion']}
            onClick={() => onNavigate('formacion')}
            onEditImage={editBtn('card-formacion', 500, 300)}
          />
          <QuickCard
            title="Recursos Didácticos"
            color="yellow"
            image={images['card-recursos']}
            onClick={() => onNavigate('recursos-generales')}
            onEditImage={editBtn('card-recursos', 500, 300)}
          />
          <QuickCard
            title="IA en Educación"
            color="purple"
            image={images['card-ia']}
            onClick={() => onNavigate('ia-educacion')}
            onEditImage={editBtn('card-ia', 500, 300)}
          />
          <QuickCard
            title="Claustro Virtual"
            color="red"
            image={images['card-claustro']}
            onClick={() => onNavigate('documentos-profesorado')}
            onEditImage={editBtn('card-claustro', 500, 300)}
          />
          <QuickCard
            title="Fotos de Eventos"
            color="pink"
            image={images['card-fotos']}
            onClick={() => onNavigate('fotos-eventos')}
            onEditImage={editBtn('card-fotos', 500, 300)}
          />
          <QuickCard
            title="Aplicaciones"
            color="blue"
            image={images['card-aplicaciones']}
            onClick={() => onNavigate('aplicaciones')}
            onEditImage={editBtn('card-aplicaciones', 500, 300)}
          />
        </div>
      </div>

      {/* Dynamic Sections (Created by Admin) */}
      {dynamicSections.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            Otras Secciones
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dynamicSections.map(section => {
              // Portada opcional: con imagen se ve como las tarjetas fijas; sin ella, tarjeta sencilla
              const clave = `card-sec-${section.id}`;
              const portada = images[clave];
              if (portada) {
                return (
                  <QuickCard
                    key={section.id}
                    title={section.label}
                    color="blue"
                    image={portada}
                    onClick={() => onNavigate(section.path || '')}
                    onEditImage={editBtn(clave, 500, 300, `Portada de «${section.label}»`)}
                  />
                );
              }
              return (
                <motion.div
                  key={section.id}
                  whileHover={{ y: -5 }}
                  onClick={() => onNavigate(section.path || '')}
                  className="relative group bg-white dark:bg-zinc-800 p-6 min-h-[120px] rounded-2xl shadow-md border border-gray-100 dark:border-zinc-700 cursor-pointer hover:border-hispa-blue transition-colors flex flex-col items-center justify-center text-center gap-3"
                >
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">{section.label}</h3>
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); setEditing({ key: clave, w: 500, h: 300, label: `Portada de «${section.label}»` }); }}
                      className="text-xs font-medium text-hispa-blue hover:underline flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                      <ImagePlus size={14} /> Añadir portada
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Photo Carousel */}
      {randomPhotos.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            Galería Reciente
          </h2>
          <div className="relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden shadow-xl bg-black">
            <AnimatePresence mode="wait">
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
                <p className="text-white/60 text-xs">
                  Subida por {randomPhotos[currentPhotoIndex].uploadedBy} · {randomPhotos[currentPhotoIndex].date}
                </p>
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
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comparte tus materiales didácticos con el resto de compañeros para enriquecer el aprendizaje.
          </p>
        </div>
        <button
          onClick={() => onNavigate('recursos-generales')}
          className="px-6 py-2 bg-hispa-blue hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors whitespace-nowrap"
        >
          Subir Recurso
        </button>
      </div>

      {/* ── Editor de imágenes ──────────────────────────────────────────────── */}
      <ImageEditModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={(key, url) => setImages(prev => ({ ...prev, [key]: url }))}
        onRemove={editing?.key.startsWith('card-sec-') ? () => {
          const key = editing.key;
          removeDashboardImage(key);
          setImages(prev => { const n = { ...prev }; delete n[key]; return n; });
        } : undefined}
      />

    </div>
  );
};
