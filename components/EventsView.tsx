import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, ArrowLeft, Image as ImageIcon, Upload, Calendar, Search, Download, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';

// Rotaciones predefinidas para el efecto de fotos apiladas manualmente
const PHOTO_ROTATIONS = [2, -3, 1.5, -2.5, 3, -1.5, 2, -2, 1, -2.5, 3.5, -1];
const getRotation = (idx: number) => PHOTO_ROTATIONS[idx % PHOTO_ROTATIONS.length];

// Variantes de animación: entrar desde el borde, reposar con leve inclinación, salir lanzado
const photoVariants = {
  enter: ({ dir }: { dir: number; idx: number }) => ({
    x: dir * 280, rotate: dir * 10, opacity: 0, scale: 0.88,
  }),
  center: ({ idx }: { dir: number; idx: number }) => ({
    x: 0, rotate: getRotation(idx), opacity: 1, scale: 1,
  }),
  exit: ({ dir }: { dir: number; idx: number }) => ({
    x: -dir * 280, rotate: -dir * 13, opacity: 0, scale: 0.82,
  }),
};
import { User, SchoolEvent, ClassFolder, Photo } from '../types';
import { getEvents, createEvent, addPhotoToEvent } from '../services/dataService';
import JSZip from 'jszip';

// Converts any string to a safe, readable filename slug
const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();

interface EventsViewProps {
  currentUser: User;
}

export const EventsView: React.FC<EventsViewProps> = ({ currentUser }) => {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<SchoolEvent | null>(null);
  const [currentFolder, setCurrentFolder] = useState<ClassFolder | null>(null);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [searchClassTerm, setSearchClassTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Lightbox state ─────────────────────────────────────────────────────────
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxDir, setLightboxDir] = useState(1);

  const openLightbox = (idx: number) => { setLightboxDir(1); setLightboxIndex(idx); };
  const closeLightbox = () => setLightboxIndex(null);
  const lightboxPrev = () => {
    if (lightboxIndex === null || !currentFolder) return;
    setLightboxDir(-1);
    setLightboxIndex((lightboxIndex - 1 + currentFolder.photos.length) % currentFolder.photos.length);
  };
  const lightboxNext = () => {
    if (lightboxIndex === null || !currentFolder) return;
    setLightboxDir(1);
    setLightboxIndex((lightboxIndex + 1) % currentFolder.photos.length);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null || !currentFolder) return;
    const n = currentFolder.photos.length;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { setLightboxDir(1);  setLightboxIndex(p => p !== null ? (p + 1) % n : 0); }
      if (e.key === 'ArrowLeft')  { setLightboxDir(-1); setLightboxIndex(p => p !== null ? (p - 1 + n) % n : 0); }
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, currentFolder]);

  const isAdmin = currentUser.role === 'admin';
  const isSuperUser = currentUser.email === 'antonio.bermejo@colegiolahispanidad.es';
  
  // Permissions
  const canManageEvents = isAdmin || isSuperUser;
  const canDownload = canManageEvents;

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = () => {
    setEvents(getEvents());
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle) return;
    createEvent(newEventTitle);
    setNewEventTitle('');
    setIsNewEventModalOpen(false);
    loadEvents();
  };

  const handleFolderClick = (folder: ClassFolder) => {
    setCurrentFolder(folder);
  };

  const handleBack = () => {
    setLightboxIndex(null);
    if (currentFolder) {
      setCurrentFolder(null);
    } else if (currentEvent) {
      setCurrentEvent(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentEvent || !currentFolder) return;
    const files = Array.from(e.target.files);

    // Compute slugs and starting index before parallel upload
    const eventSlug  = slugify(currentEvent.title);
    const classSlug  = slugify(currentFolder.className);
    const baseIndex  = currentFolder.photos.length;

    await Promise.all(files.map(async (file, i) => {
      try {
        const photoNumber = String(baseIndex + i + 1).padStart(3, '0');
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const filename = `${eventSlug}_${classSlug}_${photoNumber}.${ext}`;

        const res = await fetch(
          `/api/upload?type=photo` +
          `&eventId=${encodeURIComponent(currentEvent.id)}` +
          `&folderId=${encodeURIComponent(currentFolder.id)}` +
          `&eventSlug=${encodeURIComponent(eventSlug)}` +
          `&classSlug=${encodeURIComponent(classSlug)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': file.type || 'image/jpeg',
              'X-Filename': encodeURIComponent(filename),
            },
            body: file,
          }
        );
        const data = await res.json();
        if (data.success) {
          addPhotoToEvent(currentEvent.id, currentFolder.id, data.url, currentUser.name);
        }
      } catch (err) {
        console.error('Error uploading photo:', err);
      }
    }));

    // Refresh local state for immediate feedback
    const updatedEvents = getEvents();
    const updatedEvent = updatedEvents.find(ev => ev.id === currentEvent.id);
    const updatedFolder = updatedEvent?.folders.find(f => f.id === currentFolder.id);

    setEvents(updatedEvents);
    if (updatedEvent) setCurrentEvent(updatedEvent);
    if (updatedFolder) setCurrentFolder(updatedFolder);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Download Helpers ---

  const downloadSinglePhoto = (photo: Photo, index: number) => {
    const link = document.createElement('a');
    link.href = photo.url;
    const eventSlug = slugify(currentEvent?.title || 'evento');
    const classSlug = slugify(currentFolder?.className || 'clase');
    link.download = `${eventSlug}_${classSlug}_${String(index + 1).padStart(3, '0')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFolderAsZip = async () => {
    if (!currentFolder || !currentEvent || currentFolder.photos.length === 0) return;

    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folderName = `${currentEvent.title} - ${currentFolder.className}`;
      const imgFolder = zip.folder(folderName);

      if (imgFolder) {
        await Promise.all(currentFolder.photos.map(async (photo, index) => {
          try {
            if (photo.url.startsWith('data:')) {
              // Legacy base64 format
              const base64Data = photo.url.split(',')[1];
              if (base64Data) imgFolder.file(`foto_${index + 1}.jpg`, base64Data, { base64: true });
            } else {
              // Server URL — fetch and add as ArrayBuffer
              const res = await fetch(photo.url);
              const buffer = await res.arrayBuffer();
              imgFolder.file(`foto_${index + 1}.jpg`, buffer);
            }
          } catch (e) {
            console.error(`Error fetching photo ${index + 1}:`, e);
          }
        }));

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${folderName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    } catch (error) {
        console.error("Error creating zip", error);
        alert("Error al comprimir las imágenes.");
    } finally {
        setIsDownloading(false);
    }
  };

  // --- Render Logic ---

  // LEVEL 3: Photo Grid (Inside a Class)
  if (currentFolder && currentEvent) {
    return (
      <>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={handleBack} className="p-2 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-all text-gray-600 dark:text-gray-300">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="text-gray-400 font-normal text-lg">{currentEvent.title} /</span>
                {currentFolder.className}
            </h2>
            <p className="text-sm text-gray-500">{currentFolder.photos.length} fotos</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
             {canDownload && currentFolder.photos.length > 0 && (
                 <button 
                    onClick={downloadFolderAsZip}
                    disabled={isDownloading}
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                 >
                    {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    <span className="hidden md:inline">Descargar Carpeta</span>
                 </button>
             )}

             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-hispa-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-transform active:scale-95"
             >
                <Upload size={18} />
                <span className="hidden md:inline">Subir Fotos</span>
             </button>
          </div>
        </div>

        {currentFolder.photos.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700">
                <ImageIcon size={48} className="mb-4 opacity-50"/>
                <p>No hay fotos en esta carpeta todavía.</p>
                <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-hispa-blue underline hover:text-blue-400">Sube las primeras fotos</button>
             </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {currentFolder.photos.map((photo, idx) => (
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => openLightbox(idx)}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-sm cursor-pointer"
                    >
                        <img src={photo.url} alt="Event" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                            <div className="flex justify-end">
                                {canDownload && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); downloadSinglePhoto(photo, idx); }}
                                        className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-colors"
                                        title="Descargar imagen"
                                    >
                                        <Download size={14} />
                                    </button>
                                )}
                            </div>
                            <div>
                                <span className="block text-xs text-white/80">Subida por:</span>
                                <span className="block text-xs font-semibold text-white truncate">{photo.uploadedBy}</span>
                                <span className="block text-[10px] text-white/60">{photo.date}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        )}
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={22} />
            </button>

            {/* Counter */}
            <p className="absolute top-5 left-1/2 -translate-x-1/2 text-white/50 text-sm font-medium tabular-nums select-none">
              {lightboxIndex + 1} / {currentFolder.photos.length}
            </p>

            {/* Prev arrow */}
            {currentFolder.photos.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); lightboxPrev(); }}
                className="absolute left-3 md:left-6 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Photo with stacked-pile animation */}
            <AnimatePresence custom={{ dir: lightboxDir, idx: lightboxIndex }} mode="wait">
              <motion.div
                key={lightboxIndex}
                custom={{ dir: lightboxDir, idx: lightboxIndex }}
                variants={photoVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                onClick={e => e.stopPropagation()}
                className="relative rounded-2xl overflow-hidden cursor-default select-none"
                style={{
                  boxShadow: '0 30px 60px rgba(0,0,0,0.9), 10px 10px 0 rgba(255,255,255,0.06), 18px 18px 0 rgba(255,255,255,0.03)',
                }}
              >
                <img
                  src={currentFolder.photos[lightboxIndex].url}
                  alt="Foto del evento"
                  className="block max-h-[78vh] max-w-[88vw] md:max-w-[72vw] object-contain"
                  draggable={false}
                />
                {/* Metadata strip */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-sm font-medium">
                    Subida por {currentFolder.photos[lightboxIndex].uploadedBy}
                  </p>
                  <p className="text-white/50 text-xs">{currentFolder.photos[lightboxIndex].date}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Next arrow */}
            {currentFolder.photos.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); lightboxNext(); }}
                className="absolute right-3 md:right-6 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </>
    );
  }

  // LEVEL 2: Folder Grid (Inside an Event)
  if (currentEvent) {
    const filteredFolders = currentEvent.folders.filter(f => f.className.toLowerCase().includes(searchClassTerm.toLowerCase()));

    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={handleBack} className="p-2 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-all text-gray-600 dark:text-gray-300">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{currentEvent.title}</h2>
            <p className="text-sm text-gray-500">{currentEvent.date} · Selecciona tu clase</p>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
                type="text" 
                placeholder="Buscar clase..." 
                className="pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-hispa-blue outline-none"
                value={searchClassTerm}
                onChange={e => setSearchClassTerm(e.target.value)}
             />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFolders.map(folder => (
                <motion.div
                    key={folder.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFolderClick(folder)}
                    className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-xl cursor-pointer shadow-sm hover:shadow-md hover:border-hispa-blue transition-all flex flex-col items-center justify-center gap-2 aspect-[4/3]"
                >
                    <Folder className="text-amber-400 fill-amber-400/20" size={40} />
                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-center text-sm">{folder.className}</span>
                    <span className="text-xs text-gray-400">{folder.photos.length} items</span>
                </motion.div>
            ))}
        </div>
      </div>
    );
  }

  // LEVEL 1: Events List
  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
             <ImageIcon className="text-hispa-red" />
             Galería de Eventos
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Colección fotográfica de actividades del centro.</p>
        </div>
        {canManageEvents && (
            <button 
                onClick={() => setIsNewEventModalOpen(true)}
                className="bg-hispa-red text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
                <Plus size={20} />
                <span>Nuevo Evento</span>
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length > 0 ? (
            events.map(event => (
                <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setCurrentEvent(event)}
                    className="group bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300"
                >
                    {/* Cover logic: pick random photo from event or default */}
                    <div className="h-48 bg-gray-100 dark:bg-zinc-800 relative overflow-hidden">
                        {event.folders.some(f => f.photos.length > 0) ? (
                            <img 
                                src={event.folders.find(f => f.photos.length > 0)?.photos[0].url} 
                                alt={event.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-hispa-blue/20 to-hispa-red/20">
                                <ImageIcon size={48} className="text-white/50" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                            <Calendar size={12}/>
                            {event.date}
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 group-hover:text-hispa-blue transition-colors">{event.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <Folder size={14} />
                            {event.folders.length} clases
                        </p>
                    </div>
                </motion.div>
            ))
        ) : (
             <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                <ImageIcon size={64} className="mb-4 text-gray-300"/>
                <p className="text-xl text-gray-400">No hay eventos creados todavía.</p>
             </div>
        )}
      </div>

      {/* New Event Modal */}
      <AnimatePresence>
        {isNewEventModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl p-6"
                >
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Crear Nuevo Evento</h3>
                    <p className="text-sm text-gray-500 mb-4">Se crearán automáticamente las carpetas para todas las clases (Infantil, Primaria, ESO).</p>
                    <form onSubmit={handleCreateEvent}>
                        <input 
                            autoFocus
                            className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-3 mb-4 bg-gray-50 text-gray-900 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-hispa-red outline-none"
                            placeholder="Nombre del evento (ej: Navidad 2025)"
                            value={newEventTitle}
                            onChange={(e) => setNewEventTitle(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsNewEventModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-hispa-red text-white rounded-lg font-medium hover:bg-slate-700">Crear</button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};