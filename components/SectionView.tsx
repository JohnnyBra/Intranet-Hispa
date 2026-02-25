import React, { useState, useEffect, useRef } from 'react';

// Converts any string to a safe, readable filename slug
const slugify = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, X, Pencil, Save, ChevronDown, Tag, Globe, Sparkles } from 'lucide-react';
import { Resource, User, SectionInfo } from '../types';
import { ResourceCard } from './ResourceCard';
import { getResources, addResource, deleteResource, updateResource, getSectionInfo, updateSectionInfo, getAllCategories, AVAILABLE_COURSES, AVAILABLE_SUBJECTS } from '../services/dataService';

interface SectionViewProps {
    sectionId: string;
    currentUser: User;
}

export const SectionView: React.FC<SectionViewProps> = ({ sectionId, currentUser }) => {
    const [allResources, setAllResources] = useState<Resource[]>([]);
    const [sectionInfo, setSectionInfo] = useState<SectionInfo>({ id: sectionId, title: '', description: '' });

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSearchTags, setSelectedSearchTags] = useState<string[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Legacy Dropdown Filters (kept for advanced users, hidden by default now if preferred)
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterCourse, setFilterCourse] = useState('');
    const [filterSubject, setFilterSubject] = useState('');

    // Header Editing State
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [editedHeader, setEditedHeader] = useState({ title: '', description: '' });

    // Upload/Edit Resource Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Partial<Resource> | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const searchContainerRef = useRef<HTMLDivElement>(null);

    const isAdmin = currentUser.role === 'admin';
    const categories = getAllCategories();

    // Define allowed categories for teachers
    const TEACHER_ALLOWED_SECTIONS = [
        'recursos-generales',
        'infantil',
        'primaria',
        'secundaria',
        'ia-educacion',
        'orientacion-general',
        'orientacion-tdah',
        'orientacion-tea',
        'orientacion-dislexia',
        'orientacion-discalculia',
        'orientacion-altas-capacidades'
    ];

    const canUpload = isAdmin || TEACHER_ALLOWED_SECTIONS.includes(sectionId);

    const availableCategories = isAdmin
        ? categories
        : categories.filter(c => TEACHER_ALLOWED_SECTIONS.includes(c.id));

    // Load Data
    useEffect(() => {
        const info = getSectionInfo(sectionId);
        setSectionInfo(info);
        setEditedHeader({ title: info.title, description: info.description });
        loadResources();
        // Reset filters when section changes
        setSearchTerm('');
        setSelectedSearchTags([]);
        setFilterCourse('');
        setFilterSubject('');
        setIsFilterOpen(false);
    }, [sectionId]);

    // Click outside listener to close search suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadResources = () => {
        const all = getResources();
        setAllResources(all);
    };

    // Filter logic
    const isGlobalSearch = searchTerm.length > 0 || selectedSearchTags.length > 0;

    // If searching, use ALL resources. If not, only use current section resources.
    const sourceResources = isGlobalSearch ? allResources : allResources.filter(r => r.category === sectionId);

    const displayedResources = sourceResources.filter(r => {
        const term = searchTerm.toLowerCase();

        // 1. Tag Matching (Inline Search Tags)
        // If tags are selected, the resource MUST match ALL selected tags (Intersection)
        const matchesTags = selectedSearchTags.length === 0 || selectedSearchTags.every(tag => {
            const isInCourses = r.courses && r.courses.includes(tag);
            const isSubject = r.subject === tag;
            return isInCourses || isSubject;
        });

        // 2. Text Search
        // Search in Title, Description, or if the term matches a tag NOT selected yet
        const matchesText = term === '' ||
            r.title.toLowerCase().includes(term) ||
            r.description.toLowerCase().includes(term) ||
            (r.subject && r.subject.toLowerCase().includes(term)) ||
            (r.courses && r.courses.some(c => c.toLowerCase().includes(term)));

        // 3. Dropdown Filters (Legacy/Advanced)
        const matchesCourseFilter = !filterCourse || (r.courses && r.courses.includes(filterCourse));
        const matchesSubjectFilter = !filterSubject || r.subject === filterSubject;

        return matchesTags && matchesText && matchesCourseFilter && matchesSubjectFilter;
    });

    // Actions
    const handleSaveHeader = () => {
        const newInfo = { ...sectionInfo, title: editedHeader.title, description: editedHeader.description };
        updateSectionInfo(newInfo);
        setSectionInfo(newInfo);
        setIsEditingHeader(false);
    };

    const handleResourceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingResource?.title) return;

        let resourceUrl = editingResource.url || '#';

        // Upload file if a local file was selected (non-link types)
        if (uploadedFile && editingResource.type !== 'link' && editingResource.type !== 'video') {
            setIsUploading(true);
            try {
                const ext = (uploadedFile.name.split('.').pop() || 'bin').toLowerCase();
                const slug = slugify(editingResource.title || 'recurso');
                const filename = `${slug}_${Date.now()}.${ext}`;
                const res = await fetch(
                    `/api/upload?type=resource&category=${encodeURIComponent(editingResource.category || sectionId)}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': uploadedFile.type || 'application/octet-stream',
                            'X-Filename': encodeURIComponent(filename),
                        },
                        body: uploadedFile,
                    }
                );
                const data = await res.json();
                if (data.success) resourceUrl = data.url;
            } catch (err) {
                console.error('File upload error:', err);
            } finally {
                setIsUploading(false);
            }
        }

        const resourceData: Resource = {
            id: editingResource.id || Math.random().toString(36).substr(2, 9),
            title: editingResource.title || 'Sin título',
            description: editingResource.description || '',
            type: (editingResource.type as any) || 'pdf',
            url: resourceUrl,
            uploadedBy: editingResource.uploadedBy || currentUser.name,
            date: editingResource.date || new Date().toISOString().split('T')[0],
            category: editingResource.category || sectionId,
            courses: editingResource.courses || [],
            subject: editingResource.subject || ''
        };

        if (editingResource.id) {
            updateResource(resourceData);
        } else {
            addResource(resourceData);
        }
        loadResources();
        setIsModalOpen(false);
        setEditingResource(null);
        setUploadedFile(null);
    };

    const handleDeleteResource = async (resource: Resource) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este recurso?')) return;
        // Delete file from server if it was uploaded there
        if (resource.url.startsWith('/uploads/')) {
            try {
                await fetch(`/api/file?path=${encodeURIComponent(resource.url)}`, { method: 'DELETE' });
            } catch (e) {
                console.error('Error deleting resource file:', e);
            }
        }
        deleteResource(resource.id);
        loadResources();
    };

    const openNewResourceModal = () => {
        setEditingResource({
            type: 'pdf',
            title: '',
            description: '',
            category: sectionId,
            courses: [],
            subject: ''
        });
        setUploadedFile(null);
        setIsModalOpen(true);
    };

    const openEditResourceModal = (r: Resource) => {
        setEditingResource({ ...r });
        setUploadedFile(null);
        setIsModalOpen(true);
    };

    const toggleCourseSelection = (course: string) => {
        if (!editingResource) return;
        const current = editingResource.courses || [];
        const updated = current.includes(course)
            ? current.filter(c => c !== course)
            : [...current, course];
        setEditingResource({ ...editingResource, courses: updated });
    };

    // Search Tag Handlers
    const addSearchTag = (tag: string) => {
        if (!selectedSearchTags.includes(tag)) {
            setSelectedSearchTags([...selectedSearchTags, tag]);
        }
        // Keep focus for typing
        setIsSearchFocused(true);
    };

    const removeSearchTag = (tag: string) => {
        setSelectedSearchTags(selectedSearchTags.filter(t => t !== tag));
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                <div className="flex-1">
                    {isEditingHeader ? (
                        <div className="space-y-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                            <input
                                type="text"
                                value={editedHeader.title}
                                onChange={e => setEditedHeader({ ...editedHeader, title: e.target.value })}
                                className="w-full text-2xl font-bold border-b border-gray-300 dark:border-zinc-700 bg-transparent outline-none dark:text-white pb-1"
                            />
                            <textarea
                                value={editedHeader.description}
                                onChange={e => setEditedHeader({ ...editedHeader, description: e.target.value })}
                                className="w-full text-gray-500 bg-transparent border border-gray-200 dark:border-zinc-800 rounded p-2 outline-none dark:text-gray-300"
                            />
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsEditingHeader(false)} className="px-3 py-1 text-sm text-gray-500">Cancelar</button>
                                <button onClick={handleSaveHeader} className="px-3 py-1 text-sm bg-hispa-red text-white rounded flex items-center gap-1"><Save size={14} /> Guardar</button>
                            </div>
                        </div>
                    ) : (
                        <div className="group relative">
                            <motion.h2
                                key={sectionInfo.title}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3"
                            >
                                {sectionInfo.title}
                                {isAdmin && (
                                    <button onClick={() => setIsEditingHeader(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-hispa-red">
                                        <Pencil size={18} />
                                    </button>
                                )}
                            </motion.h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{sectionInfo.description}</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 shrink-0">
                    {canUpload && (
                        <button
                            onClick={openNewResourceModal}
                            className="flex items-center gap-2 bg-hispa-red hover:bg-slate-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-slate-500/30 transition-all active:scale-95"
                        >
                            <Plus size={20} />
                            <span>Nuevo Recurso</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Guías y Recursos Destacados (Geniallys) - Only shown in Formación */}
            {sectionId === 'formacion' && (
                <div className="space-y-6 mb-8">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Globe className="text-hispa-red" />
                        Guías Destacadas
                    </h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* Genially 1: Guia TIC La Hispanidad */}
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 overflow-hidden relative">
                            <div className="p-3 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 flex justify-between items-center">
                                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Guía TIC La Hispanidad</h4>
                                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold uppercase">Interactivo</span>
                            </div>
                            <div className="w-full">
                                <div style={{ position: 'relative', paddingBottom: '56.25%', paddingTop: 0, height: 0 }}>
                                    <iframe
                                        title="Guia TIC La Hispanidad"
                                        frameBorder="0"
                                        width="1200"
                                        height="675"
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                        src="https://view.genially.com/65b29357c891d30014ca68dc"
                                        allow="fullscreen; clipboard-read; clipboard-write"
                                        allowFullScreen={true}
                                        scrolling="yes">
                                    </iframe>
                                </div>
                            </div>
                        </div>

                        {/* Genially 2: ¿Cómo decidir qué recurso? */}
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 overflow-hidden relative">
                            <div className="p-3 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 flex justify-between items-center">
                                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">¿Cómo decidir qué recurso?</h4>
                                <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold uppercase">Metodología</span>
                            </div>
                            <div className="w-full">
                                <div style={{ position: 'relative', paddingBottom: '56.25%', paddingTop: 0, height: 0 }}>
                                    <iframe
                                        title="¿Cómo decidir qué recurso?"
                                        frameBorder="0"
                                        width="1200"
                                        height="675"
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                        src="https://view.genially.com/65b3e785055677001389ae83"
                                        allow="fullscreen; clipboard-read; clipboard-write"
                                        allowFullScreen={true}
                                        scrolling="yes">
                                    </iframe>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Asistentes IA Destacados (Gemini Gems) - Only shown in IA */}
            {sectionId === 'ia-educacion' && (
                <div className="space-y-6 mb-8">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Sparkles className="text-indigo-500" />
                        Asistente IA Destacado
                    </h3>
                    <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-1 shadow-xl shadow-purple-500/20 mb-8 inline-block w-full">
                        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[1.4rem] p-6 lg:p-8 flex flex-col lg:flex-row items-center gap-8 relative overflow-hidden group w-full">
                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 p-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-all duration-700"></div>
                            <div className="absolute bottom-0 left-0 p-32 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-700"></div>

                            <div className="flex-1 space-y-4 relative z-10 w-full text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                    Nuevo Gem
                                </div>
                                <h4 className="text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-indigo-400 dark:to-pink-400">
                                    Asistente de IA educativa en primaria
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-2xl">
                                    Descubre nuestro asistente especializado de Gemini personalizado. Optimiza tu planificación de clases, genera ideas innovadoras y obtén respuestas específicas para tus necesidades educativas.
                                </p>
                                <div className="pt-4 flex flex-wrap gap-4">
                                    <a
                                        href="https://gemini.google.com/gem/1X1NMRsX5fvSDa3EaeuLTzJyE6ELFCj0m?usp=sharing"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-300"
                                    >
                                        <Sparkles size={20} className="text-purple-200" />
                                        <span>Probar Gemini Gem</span>
                                    </a>
                                </div>
                            </div>

                            {/* Right side visual representation */}
                            <div className="w-full lg:w-1/3 relative z-10 flex justify-center mt-6 lg:mt-0">
                                <div className="relative w-48 h-48 lg:w-64 lg:h-64 rounded-2xl bg-gradient-to-br from-indigo-50 to-pink-50 dark:from-indigo-900/20 dark:to-pink-900/20 flex items-center justify-center p-8 border border-indigo-100 dark:border-indigo-800/50 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border-2 border-dashed border-indigo-300/50 dark:border-indigo-500/30 rounded-full m-4"
                                    />
                                    <div className="relative w-24 h-24 lg:w-32 lg:h-32 text-indigo-500 dark:text-indigo-400 drop-shadow-xl saturate-150 group-hover:drop-shadow-2xl transition-all duration-300">
                                        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="url(#paint0_linear)" />
                                            <path d="M12 5L13.5 10.5L19 12L13.5 13.5L12 19L10.5 13.5L5 12L10.5 10.5L12 5Z" fill="white" className="animate-pulse duration-1000" />
                                            <path d="M18.5 4L19 6L21 6.5L19 7L18.5 9L18 7L16 6.5L18 6L18.5 4Z" fill="white" className="animate-pulse delay-700" />
                                            <path d="M5.5 17L6 19L8 19.5L6 20L5.5 22L5 20L3 19.5L5 19L5.5 17Z" fill="white" className="animate-pulse delay-300" />
                                            <defs>
                                                <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                                    <stop stopColor="#6366F1" />
                                                    <stop offset="1" stopColor="#EC4899" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Advanced Search & Filter Bar */}
            <div
                ref={searchContainerRef}
                className={`relative bg-white dark:bg-zinc-900 rounded-xl shadow-sm border transition-all z-20 ${isGlobalSearch ? 'border-blue-300 dark:border-blue-700 ring-1 ring-blue-100 dark:ring-blue-900' : 'border-gray-100 dark:border-zinc-800'}`}
            >
                <div className="p-2 md:p-3 flex items-center gap-2 flex-wrap min-h-[56px]">
                    {isGlobalSearch ? <Globe className="text-hispa-blue ml-2 animate-pulse" /> : <Search className="text-gray-400 ml-2" />}

                    {/* Render Selected Chips */}
                    {selectedSearchTags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/40 text-hispa-blue dark:text-blue-300 px-2 py-1 rounded-md text-sm font-medium animate-in fade-in zoom-in duration-200">
                            {tag}
                            <button onClick={() => removeSearchTag(tag)} className="hover:text-red-500"><X size={14} /></button>
                        </span>
                    ))}

                    <input
                        type="text"
                        placeholder={selectedSearchTags.length > 0 ? "Buscar en estos recursos..." : "Buscar en toda la intranet..."}
                        className="flex-1 bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 min-w-[200px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                    />

                    {/* Filter Toggle Button (Legacy) */}
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 mr-2 ${isFilterOpen ? 'bg-gray-100 text-hispa-blue dark:bg-zinc-800' : 'text-gray-400 hover:text-hispa-red'}`}
                    >
                        <Filter size={20} />
                    </button>
                </div>

                {/* Intelligent Suggestions Dropdown */}
                <AnimatePresence>
                    {isSearchFocused && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden max-h-[400px] overflow-y-auto"
                        >
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Courses Suggestions */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                        <Tag size={12} /> Cursos
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_COURSES.map(course => (
                                            <button
                                                key={course}
                                                onClick={() => addSearchTag(course)}
                                                disabled={selectedSearchTags.includes(course)}
                                                className={`text-sm px-3 py-1.5 rounded-full border transition-colors text-left
                                            ${selectedSearchTags.includes(course)
                                                        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-transparent cursor-default'
                                                        : 'border-gray-200 dark:border-zinc-700 hover:border-hispa-blue hover:text-hispa-blue dark:text-gray-300 dark:hover:text-blue-300'
                                                    }`}
                                            >
                                                {course}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Subjects Suggestions */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                        <Tag size={12} /> Asignaturas
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_SUBJECTS.map(subject => (
                                            <button
                                                key={subject}
                                                onClick={() => addSearchTag(subject)}
                                                disabled={selectedSearchTags.includes(subject)}
                                                className={`text-sm px-3 py-1.5 rounded-full border transition-colors text-left
                                            ${selectedSearchTags.includes(subject)
                                                        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-transparent cursor-default'
                                                        : 'border-gray-200 dark:border-zinc-700 hover:border-hispa-blue hover:text-hispa-blue dark:text-gray-300 dark:hover:text-blue-300'
                                                    }`}
                                            >
                                                {subject}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 text-xs text-center text-gray-400 border-t border-gray-100 dark:border-zinc-800">
                                Selecciona etiquetas para filtrar específicamente dentro de esas categorías.
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Advanced Filters Panel (Legacy) */}
                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/20"
                        >
                            <div className="p-4 flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Filtrar por Curso</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded-lg outline-none focus:ring-1 focus:ring-hispa-blue"
                                            value={filterCourse}
                                            onChange={(e) => setFilterCourse(e.target.value)}
                                        >
                                            <option value="">Todos los cursos</option>
                                            {AVAILABLE_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Filtrar por Asignatura</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded-lg outline-none focus:ring-1 focus:ring-hispa-blue"
                                            value={filterSubject}
                                            onChange={(e) => setFilterSubject(e.target.value)}
                                        >
                                            <option value="">Todas las asignaturas</option>
                                            {AVAILABLE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                                {/* Clear Filters Button */}
                                {(filterCourse || filterSubject) && (
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => { setFilterCourse(''); setFilterSubject(''); }}
                                            className="text-sm text-red-500 hover:text-red-700 py-2.5 px-3 font-medium"
                                        >
                                            Borrar filtros
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Global Search Indicator */}
            {isGlobalSearch && (
                <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Globe size={14} className="text-hispa-blue" />
                    Mostrando resultados de toda la intranet
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode='popLayout'>
                    {displayedResources.length > 0 ? (
                        displayedResources.map((res) => (
                            <motion.div
                                key={res.id}
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ResourceCard
                                    resource={res}
                                    isAdmin={isAdmin}
                                    onEdit={() => openEditResourceModal(res)}
                                    onDelete={() => handleDeleteResource(res)}
                                />
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400"
                        >
                            <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                <Search size={32} />
                            </div>
                            <p>No se encontraron recursos con estos criterios.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Upload/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && editingResource && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="relative bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                    {editingResource.id ? 'Editar recurso' : 'Subir nuevo recurso'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)}><X className="text-gray-500 hover:text-red-500" /></button>
                            </div>
                            <form onSubmit={handleResourceSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-hispa-red outline-none dark:text-white"
                                            value={editingResource.title}
                                            onChange={e => setEditingResource({ ...editingResource, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                        <textarea
                                            className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-hispa-red outline-none dark:text-white"
                                            rows={3}
                                            value={editingResource.description}
                                            onChange={e => setEditingResource({ ...editingResource, description: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-hispa-red outline-none dark:text-white"
                                            value={editingResource.type}
                                            onChange={e => setEditingResource({ ...editingResource, type: e.target.value as any })}
                                        >
                                            <option value="pdf">PDF</option>
                                            <option value="doc">Documento</option>
                                            <option value="image">Imagen</option>
                                            <option value="video">Video</option>
                                            <option value="link">Enlace Web</option>
                                        </select>
                                    </div>

                                    {!editingResource.id && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Archivo / URL</label>
                                            {editingResource.type === 'link' || editingResource.type === 'video' ? (
                                                <input
                                                    type="url"
                                                    placeholder="https://..."
                                                    className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-hispa-red outline-none dark:text-white"
                                                    value={editingResource.url === '#' ? '' : editingResource.url}
                                                    onChange={e => setEditingResource({ ...editingResource, url: e.target.value })}
                                                />
                                            ) : (
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        onChange={e => setUploadedFile(e.target.files?.[0] || null)}
                                                    />
                                                    <div className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-dashed border-gray-300 dark:border-zinc-600 text-sm text-gray-500 text-center truncate">
                                                        {uploadedFile ? uploadedFile.name : 'Click para seleccionar archivo'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sección</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-hispa-red outline-none dark:text-white"
                                            value={editingResource.category}
                                            onChange={e => setEditingResource({ ...editingResource, category: e.target.value })}
                                        >
                                            {availableCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignatura</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-hispa-red outline-none dark:text-white"
                                            value={editingResource.subject}
                                            onChange={e => setEditingResource({ ...editingResource, subject: e.target.value })}
                                        >
                                            <option value="">-- General / No aplica --</option>
                                            {AVAILABLE_SUBJECTS.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Courses Multi-select */}
                                <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Etiquetar Cursos (Selección múltiple)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {AVAILABLE_COURSES.map(course => {
                                            const isSelected = editingResource.courses?.includes(course);
                                            return (
                                                <button
                                                    key={course}
                                                    type="button"
                                                    onClick={() => toggleCourseSelection(course)}
                                                    className={`text-xs px-2 py-2 rounded border transition-all ${isSelected
                                                        ? 'bg-hispa-blue text-white border-hispa-blue'
                                                        : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:border-hispa-blue'
                                                        }`}
                                                >
                                                    {course}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button type="submit" disabled={isUploading} className="w-full py-3 bg-hispa-red hover:bg-slate-700 text-white font-bold rounded-lg shadow-md transition-all mt-4 disabled:opacity-60 disabled:cursor-not-allowed">
                                    {isUploading ? 'Subiendo archivo...' : (editingResource.id ? 'Guardar Cambios' : 'Subir Recurso')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};