import { Resource, NavItem, SectionInfo, SchoolEvent, ClassFolder } from '../types';

export const AVAILABLE_COURSES = [
  '3 años Infantil', '4 años Infantil', '5 años Infantil',
  '1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria',
  '1º ESO', '2º ESO', '3º ESO', '4º ESO'
];

export const AVAILABLE_SUBJECTS = [
  'Lengua Castellana', 'Matemáticas', 'Inglés', 'Francés', 
  'Ciencias Naturales', 'Ciencias Sociales', 'Física y Química', 'Biología',
  'Geografía e Historia', 'Educación Física', 'Música', 'Plástica',
  'Tecnología', 'Religión/Valores', 'Tutoría', 'Orientación', 'General'
];

// Initial Data Bootstrapping with REAL Resources
const INITIAL_RESOURCES: Resource[] = [
  // --- IA en Educación ---
  {
    id: 'ia-1',
    title: 'MagicSchool.ai - IA para Docentes',
    description: 'Plataforma con más de 50 herramientas de IA para ahorrar tiempo: generador de rúbricas, planes de clase y adaptaciones.',
    type: 'link',
    url: 'https://www.magicschool.ai/',
    uploadedBy: 'Coordinación TDE',
    date: '2024-11-01',
    category: 'ia-educacion',
    subject: 'General',
    courses: []
  },

  // --- Documentos Profesorado ---
  { 
    id: 'doc-1', 
    title: 'Calendario Escolar Huelva 24/25', 
    description: 'Calendario oficial de la Delegación Territorial con festivos y puentes.', 
    type: 'pdf', 
    url: 'https://www.juntadeandalucia.es/educacion/portals/web/delegacion-huelva/calendario-escolar', 
    uploadedBy: 'Dirección', 
    date: '2024-09-01', 
    category: 'documentos-profesorado',
    subject: 'General',
    courses: []
  },
  { 
    id: 'doc-2', 
    title: 'Guía Evaluación LOMLOE', 
    description: 'Resumen de los criterios de evaluación competenciales y descriptores operativos.', 
    type: 'pdf', 
    url: 'https://www.educacionfpydeportes.gob.es/dam/jcr:6543594b-d77c-4713-912c-5421235123/guia-evaluacion-lomloe.pdf', 
    uploadedBy: 'Jefatura de Estudios', 
    date: '2024-09-05', 
    category: 'documentos-profesorado',
    subject: 'General',
    courses: []
  },
  
  // --- Orientación ---
  {
    id: 'discal-1',
    title: 'Guía Discalculia para Docentes',
    description: 'Indicadores de riesgo y adaptaciones en el área de matemáticas.',
    type: 'link',
    url: 'https://integratek.es/discalculia/',
    uploadedBy: 'Dpto. Matemáticas',
    date: '2024-11-20',
    category: 'orientacion-discalculia',
    subject: 'Matemáticas',
    courses: ['1º Primaria', '2º Primaria', '3º Primaria']
  },

  // --- Primaria ---
  { 
    id: 'pri-1', 
    title: 'LiveWorksheets - Matemáticas', 
    description: 'Fichas interactivas autocorregibles.', 
    type: 'link', 
    url: 'https://es.liveworksheets.com/', 
    uploadedBy: 'Carlos Ruiz', 
    date: '2024-10-20', 
    category: 'primaria',
    subject: 'Matemáticas',
    courses: ['3º Primaria', '4º Primaria'] 
  },
  { 
    id: 'pri-2', 
    title: 'Mapas Interactivos Flash', 
    description: 'Juegos para aprender provincias y ríos de España.', 
    type: 'link', 
    url: 'https://mapasinteractivos.didactalia.net/comunidad/mapasflash', 
    uploadedBy: 'Carlos Ruiz', 
    date: '2024-10-25', 
    category: 'primaria',
    subject: 'Ciencias Sociales',
    courses: ['5º Primaria', '6º Primaria']
  },

  // --- Secundaria ---
  { 
    id: 'sec-1', 
    title: 'PhET Simulaciones', 
    description: 'Simulaciones interactivas de Física y Química.', 
    type: 'link', 
    url: 'https://phet.colorado.edu/es/', 
    uploadedBy: 'Dpto. Ciencias', 
    date: '2024-10-05', 
    category: 'secundaria',
    subject: 'Física y Química',
    courses: ['2º ESO', '3º ESO', '4º ESO']
  },
  
  // --- Infantil ---
  { 
    id: 'inf-1', 
    title: 'Orientación Andújar - Grafomotricidad', 
    description: 'Cuadernillo completo para trabajar trazos.', 
    type: 'pdf', 
    url: 'https://www.orientacionandujar.es/wp-content/uploads/2023/09/cuaderno-grafomotricidad.pdf', 
    uploadedBy: 'María Lopez', 
    date: '2024-10-02', 
    category: 'infantil',
    subject: 'General',
    courses: ['3 años Infantil', '4 años Infantil', '5 años Infantil']
  },
];

const INITIAL_NAV_ITEMS: NavItem[] = [
  { id: 'inicio', label: 'Inicio', iconName: 'Home', path: 'dashboard' },
  { id: 'aulas', label: 'Aulas', iconName: 'Layout', externalUrl: 'https://aulas.bibliohispa.es' },
  { id: 'formacion', label: 'Formación', iconName: 'BookOpen', path: 'formacion' },
  { 
    id: 'recursos', 
    label: 'Recursos', 
    iconName: 'GraduationCap',
    children: [
      { id: 'rec-gen', label: 'Recursos generales', path: 'recursos-generales' },
      { 
        id: 'rec-curso', 
        label: 'Recursos por curso', 
        children: [
          { id: 'infantil', label: 'Infantil', path: 'infantil' },
          { id: 'primaria', label: 'Primaria', path: 'primaria' },
          { id: 'secundaria', label: 'Secundaria', path: 'secundaria' }
        ]
      },
      {
        id: 'orientacion',
        label: 'Orientación',
        children: [
           { id: 'ori-gen', label: 'General / Normativa', path: 'orientacion-general' },
           { id: 'ori-tdah', label: 'TDAH', path: 'orientacion-tdah' },
           { id: 'ori-tea', label: 'TEA (Autismo)', path: 'orientacion-tea' },
           { id: 'ori-dislexia', label: 'Dislexia y Lectoescritura', path: 'orientacion-dislexia' },
           { id: 'ori-discalculia', label: 'Discalculia', path: 'orientacion-discalculia' },
           { id: 'ori-aacc', label: 'Altas Capacidades', path: 'orientacion-altas-capacidades' }
        ]
      }
    ]
  },
  { id: 'ia', label: 'IA en educación', iconName: 'Brain', path: 'ia-educacion' },
  { id: 'fotos', label: 'Fotos de Eventos', iconName: 'Image', path: 'fotos-eventos' },
  // "Claustro Virtual" (previously Documentos Profesorado) moved to end
  { id: 'claustro', label: 'Claustro Virtual', iconName: 'FileText', path: 'documentos-profesorado' }
];

const INITIAL_SECTIONS: SectionInfo[] = [
  { id: 'formacion', title: 'Formación Profesorado', description: 'Cursos, tutoriales y guías para la mejora continua de la competencia docente.' },
  { id: 'recursos-generales', title: 'Recursos Generales', description: 'Materiales transversales, bancos de imágenes, rúbricas y metodologías activas.' },
  { id: 'infantil', title: 'Infantil', description: 'Recursos específicos, fichas, canciones y asamblea para la etapa de Infantil.' },
  { id: 'primaria', title: 'Primaria', description: 'Fichas interactivas, mapas y recursos de apoyo para la etapa de Primaria.' },
  { id: 'secundaria', title: 'Secundaria', description: 'Simuladores, modelos de exámenes y herramientas avanzadas para ESO y Bachillerato.' },
  { id: 'ia-educacion', title: 'IA en Educación', description: 'Herramientas de Inteligencia Artificial, prompts y normativa ética para el aula.' },
  { id: 'documentos-profesorado', title: 'Claustro Virtual', description: 'Documentación oficial, normativa LOMLOE, protocolos y archivos de dirección.' },
  // Orientation Sections
  { id: 'orientacion-general', title: 'Orientación General', description: 'Normativa, protocolos generales y documentos marco de atención a la diversidad.' },
  { id: 'orientacion-tdah', title: 'TDAH', description: 'Recursos, pautas y estrategias para el alumnado con Déficit de Atención e Hiperactividad.' },
  { id: 'orientacion-tea', title: 'TEA', description: 'Pictogramas, guías y adaptaciones para el Trastorno del Espectro Autista.' },
  { id: 'orientacion-dislexia', title: 'Dislexia', description: 'Herramientas para dificultades específicas en lectoescritura.' },
  { id: 'orientacion-discalculia', title: 'Discalculia', description: 'Recursos manipulativos y adaptaciones para dificultades matemáticas.' },
  { id: 'orientacion-altas-capacidades', title: 'Altas Capacidades', description: 'Programas de enriquecimiento y profundización curricular.' },
];

const INITIAL_EVENTS: SchoolEvent[] = [];

// --- Helpers ---

const getFromStorage = <T>(key: string, defaults: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) return defaults;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return defaults;
  }
};

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- API ---

// Resources
export const getResources = (): Resource[] => getFromStorage<Resource[]>('hispa_resources', INITIAL_RESOURCES);

export const addResource = (resource: Resource) => {
  const current = getResources();
  saveToStorage('hispa_resources', [resource, ...current]);
};

export const updateResource = (resource: Resource) => {
  const current = getResources();
  const index = current.findIndex(r => r.id === resource.id);
  if (index !== -1) {
    current[index] = resource;
    saveToStorage('hispa_resources', current);
  }
};

export const deleteResource = (id: string) => {
  const current = getResources();
  saveToStorage('hispa_resources', current.filter(r => r.id !== id));
};

// Events & Photos
export const getEvents = (): SchoolEvent[] => getFromStorage<SchoolEvent[]>('hispa_events', INITIAL_EVENTS);

export const createEvent = (title: string) => {
  const current = getEvents();
  
  // Generate folders for all courses (Lines A and B)
  const folders: ClassFolder[] = [];
  AVAILABLE_COURSES.forEach(course => {
    folders.push({ id: Math.random().toString(36).substr(2, 9), className: `${course} A`, photos: [] });
    folders.push({ id: Math.random().toString(36).substr(2, 9), className: `${course} B`, photos: [] });
  });

  const newEvent: SchoolEvent = {
    id: Math.random().toString(36).substr(2, 9),
    title,
    date: new Date().toISOString().split('T')[0],
    folders
  };

  saveToStorage('hispa_events', [newEvent, ...current]);
};

export const addPhotoToEvent = (eventId: string, folderId: string, photoUrl: string, user: string) => {
  const events = getEvents();
  const eventIdx = events.findIndex(e => e.id === eventId);
  if (eventIdx === -1) return;

  const event = events[eventIdx];
  const folderIdx = event.folders.findIndex(f => f.id === folderId);
  if (folderIdx === -1) return;

  const newPhoto = {
    id: Math.random().toString(36).substr(2, 9),
    url: photoUrl,
    uploadedBy: user,
    date: new Date().toISOString().split('T')[0]
  };

  event.folders[folderIdx].photos.push(newPhoto);
  events[eventIdx] = event;
  saveToStorage('hispa_events', events);
};

// Navigation
export const getNavItems = (): NavItem[] => getFromStorage<NavItem[]>('hispa_nav', INITIAL_NAV_ITEMS);

export const addNavItem = (item: NavItem) => {
  const current = getNavItems();
  saveToStorage('hispa_nav', [...current, item]);
};

// Sections Info (Headers)
export const getSectionInfo = (id: string): SectionInfo => {
  const sections = getFromStorage<SectionInfo[]>('hispa_sections', INITIAL_SECTIONS);
  return sections.find(s => s.id === id) || { id, title: 'Sección', description: 'Gestión de recursos' };
};

export const updateSectionInfo = (info: SectionInfo) => {
  const sections = getFromStorage<SectionInfo[]>('hispa_sections', INITIAL_SECTIONS);
  const index = sections.findIndex(s => s.id === info.id);
  if (index !== -1) {
    sections[index] = info;
  } else {
    sections.push(info);
  }
  saveToStorage('hispa_sections', sections);
};

export const getAllCategories = (): {id: string, label: string}[] => {
  const items = getNavItems();
  const categories: {id: string, label: string}[] = [];
  
  const traverse = (list: NavItem[]) => {
    list.forEach(item => {
      if (item.path) categories.push({ id: item.path, label: item.label });
      if (item.children) traverse(item.children);
    });
  };
  traverse(items);
  return categories;
};