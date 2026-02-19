import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink, BookOpen, Users, Brain, GraduationCap,
  FileText, Image as ImageIcon, Folder, Pencil, X, Upload, Check,
} from 'lucide-react';
import { getNavItems, getEvents, getDashboardImages, saveDashboardImage } from '../services/dataService';
import { NavItem, Photo, User } from '../types';

interface DashboardProps {
  onNavigate: (path: string) => void;
  currentUser?: User | null;
}

// ── Default fallback images ──────────────────────────────────────────────────
const DEFAULT_IMAGES: Record<string, string> = {
  hero:           'https://picsum.photos/id/1031/1600/600',
  'card-aulas':   'https://picsum.photos/id/201/500/300',
  'card-formacion': 'https://picsum.photos/id/3/500/300',
  'card-recursos':  'https://picsum.photos/id/366/500/300',
  'card-ia':      'https://picsum.photos/id/60/500/300',
  'card-claustro': 'https://picsum.photos/id/453/500/300',
  'card-fotos':   'https://picsum.photos/id/450/500/300',
};

// ── Canvas-based resize / crop ───────────────────────────────────────────────
const processImage = (
  file: File,
  targetW: number,
  targetH: number,
  mode: 'cover' | 'contain',
): Promise<Blob> =>
  new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;

      const imgRatio    = img.width / img.height;
      const targetRatio = targetW / targetH;

      if (mode === 'contain') {
        // Fill background then draw full image centred (letterbox)
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, targetW, targetH);
        let drawW: number, drawH: number;
        if (imgRatio > targetRatio) {
          drawW = targetW;
          drawH = targetW / imgRatio;
        } else {
          drawH = targetH;
          drawW = targetH * imgRatio;
        }
        ctx.drawImage(img, (targetW - drawW) / 2, (targetH - drawH) / 2, drawW, drawH);
      } else {
        // Cover: centre-crop to fill
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > targetRatio) {
          sw = img.height * targetRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / targetRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      }

      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.82);
    };
    img.src = url;
  });

// ── QuickCard ────────────────────────────────────────────────────────────────
const QuickCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  image: string;
  onClick: () => void;
  color: string;
  onEditImage?: () => void;
}> = ({ title, icon, image, onClick, color, onEditImage }) => (
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
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
        title="Cambiar imagen"
      >
        <Pencil size={14} />
      </button>
    )}

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

// ── Dashboard ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';

  const [dynamicSections, setDynamicSections] = useState<NavItem[]>([]);
  const [randomPhotos, setRandomPhotos]       = useState<Photo[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [images, setImages] = useState<Record<string, string>>(DEFAULT_IMAGES);

  // Modal state
  const [editingKey, setEditingKey]     = useState<{ key: string; w: number; h: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);
  const [previewBlob, setPreviewBlob]   = useState<Blob | null>(null);
  const [cropMode, setCropMode]         = useState<'cover' | 'contain'>('cover');
  const [isProcessing, setIsProcessing] = useState(false);

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
    const excludedIds = ['inicio', 'aulas', 'formacion', 'recursos', 'ia', 'claustro', 'fotos'];
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

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openEditModal = (key: string, w: number, h: number) => {
    setEditingKey({ key, w, h });
    setSelectedFile(null);
    setPreviewUrl(null);
    setCropMode('cover');
  };

  const closeModal = () => {
    setEditingKey(null);
    setSelectedFile(null);
    setPreviewBlob(null);
    setPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingKey) return;
    setSelectedFile(file);
    setIsProcessing(true);
    const blob = await processImage(file, editingKey.w, editingKey.h, cropMode);
    setPreviewBlob(blob);
    setPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setIsProcessing(false);
  };

  const handleModeChange = async (mode: 'cover' | 'contain') => {
    setCropMode(mode);
    if (selectedFile && editingKey) {
      setIsProcessing(true);
      const blob = await processImage(selectedFile, editingKey.w, editingKey.h, mode);
      setPreviewBlob(blob);
      setPreviewUrl(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!previewBlob || !editingKey) return;
    setIsProcessing(true);
    try {
      const res = await fetch(
        `/api/upload?type=dashboard&key=${encodeURIComponent(editingKey.key)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'X-Filename': encodeURIComponent(`${editingKey.key}.jpg`),
          },
          body: previewBlob,
        }
      );
      const data = await res.json();
      if (data.success) {
        saveDashboardImage(editingKey.key, data.url);
        setImages(prev => ({ ...prev, [editingKey.key]: data.url }));
        closeModal();
      }
    } catch (err) {
      console.error('Dashboard image upload error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Shorthand: returns edit handler only for admins
  const editBtn = (key: string, w: number, h: number) =>
    isAdmin ? () => openEditModal(key, w, h) : undefined;

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
            onClick={() => openEditModal('hero', 1200, 400)}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          >
            <Pencil size={13} />
            Cambiar imagen
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
            icon={<ExternalLink className="text-white" />}
            color="blue"
            image={images['card-aulas']}
            onClick={() => window.open('https://aulas.bibliohispa.es', '_blank')}
            onEditImage={editBtn('card-aulas', 500, 300)}
          />
          <QuickCard
            title="Formación"
            icon={<BookOpen className="text-white" />}
            color="green"
            image={images['card-formacion']}
            onClick={() => onNavigate('formacion')}
            onEditImage={editBtn('card-formacion', 500, 300)}
          />
          <QuickCard
            title="Recursos Didácticos"
            icon={<Users className="text-white" />}
            color="yellow"
            image={images['card-recursos']}
            onClick={() => onNavigate('recursos-generales')}
            onEditImage={editBtn('card-recursos', 500, 300)}
          />
          <QuickCard
            title="IA en Educación"
            icon={<Brain className="text-white" />}
            color="purple"
            image={images['card-ia']}
            onClick={() => onNavigate('ia-educacion')}
            onEditImage={editBtn('card-ia', 500, 300)}
          />
          <QuickCard
            title="Claustro Virtual"
            icon={<FileText className="text-white" />}
            color="red"
            image={images['card-claustro']}
            onClick={() => onNavigate('documentos-profesorado')}
            onEditImage={editBtn('card-claustro', 500, 300)}
          />
          <QuickCard
            title="Fotos de Eventos"
            icon={<ImageIcon className="text-white" />}
            color="pink"
            image={images['card-fotos']}
            onClick={() => onNavigate('fotos-eventos')}
            onEditImage={editBtn('card-fotos', 500, 300)}
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
            <ImageIcon className="text-orange-500" />
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

      {/* ── Image Edit Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-zinc-700"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Cambiar imagen</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                {editingKey.key === 'hero' ? 'Banner principal' : 'Tarjeta de acceso'} · {editingKey.w} × {editingKey.h} px
              </p>

              {/* Preview */}
              <div
                className="w-full rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-zinc-800 relative flex items-center justify-center"
                style={{ aspectRatio: `${editingKey.w}/${editingKey.h}` }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={36} className="text-gray-300 dark:text-zinc-600" />
                )}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                    <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Mode selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => handleModeChange('cover')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    cropMode === 'cover'
                      ? 'bg-hispa-red text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  Recortar para rellenar
                </button>
                <button
                  onClick={() => handleModeChange('contain')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    cropMode === 'contain'
                      ? 'bg-hispa-red text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  Ajustar sin recortar
                </button>
              </div>

              {/* File input */}
              <label className="block w-full cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl text-center text-gray-500 dark:text-gray-400 hover:border-hispa-red dark:hover:border-hispa-blue transition text-sm flex items-center justify-center gap-2">
                  <Upload size={15} />
                  {selectedFile ? selectedFile.name : 'Seleccionar imagen'}
                </div>
              </label>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!previewBlob || isProcessing}
                className="mt-4 w-full py-3 bg-hispa-red text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Guardar imagen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
