# Aplicaciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una sección "Aplicaciones" a la intranet con tarjetas visuales, modal iframe con opción de nueva pestaña, y CRUD completo para administradores.

**Architecture:** Nuevo componente `AppsView.tsx` siguiendo el mismo patrón que `EventsView`. Datos persistidos como `hispa_apps` en `data/hispa_apps.json` via `dataService`. El proxy-server.js gestiona el upload de imágenes bajo `uploads/apps/`.

**Tech Stack:** React 19, TypeScript, Framer Motion, Tailwind CDN, Lucide icons, Vite 6.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `types.ts` | Modificar | Añadir interfaz `App` |
| `services/dataService.ts` | Modificar | Seeds, CRUD functions, nav migration, loadAllData |
| `proxy-server.js` | Modificar | Añadir caso `type=app` en handleUpload |
| `components/AppsView.tsx` | Crear | Grid de tarjetas + modal iframe + admin CRUD |
| `App.tsx` | Modificar | Importar AppsView, añadir ruta `'aplicaciones'` |

---

## Task 1: Añadir tipo `App` a `types.ts`

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Añadir la interfaz `App` al final de `types.ts`**

Abrir `types.ts`. Después de la interfaz `NavItem` (línea ~59), añadir:

```ts
export interface App {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
  accentColor?: string;
  tags?: string[];
}
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(types): añadir interfaz App para la sección Aplicaciones"
```

---

## Task 2: Actualizar `dataService.ts`

**Files:**
- Modify: `services/dataService.ts`

Hay cuatro cambios en este archivo: (a) importar `App`, (b) añadir seeds, (c) añadir `aplicaciones` a nav + migración, (d) añadir CRUD.

- [ ] **Step 1: Añadir `App` al import de types**

Línea 1 de `dataService.ts`, cambiar:
```ts
import { Resource, NavItem, SectionInfo, SchoolEvent, ClassFolder } from '../types';
```
por:
```ts
import { Resource, NavItem, SectionInfo, SchoolEvent, ClassFolder, App } from '../types';
```

- [ ] **Step 2: Añadir `INITIAL_APPS` justo antes de `INITIAL_NAV_ITEMS`**

Después de la línea `];` que cierra `INITIAL_RESOURCES` (línea ~125), insertar:

```ts
const INITIAL_APPS: App[] = [
  {
    id: 'plik',
    name: 'Plik',
    description: 'Evaluaciones y coevaluaciones al estilo Plickers/Kahoot. Lanza preguntas en tiempo real y recoge respuestas del aula.',
    url: 'https://plik.bibliohispa.es',
    accentColor: '#234B6E',
    tags: ['General'],
  },
  {
    id: 'barcar',
    name: 'Barcar',
    description: 'Hundir la flota multijugador para practicar coordenadas cartesianas. Ideal para 6º Primaria y 1º ESO.',
    url: 'https://barcar.bibliohispa.es',
    accentColor: '#5D9BC9',
    tags: ['6º Primaria', '1º ESO', 'Matemáticas'],
  },
];
```

- [ ] **Step 3: Añadir `aplicaciones` a `INITIAL_NAV_ITEMS`**

En `INITIAL_NAV_ITEMS` (línea ~127), añadir la entrada antes de `claustro`:

```ts
  { id: 'aplicaciones', label: 'Aplicaciones', iconName: 'AppWindow', path: 'aplicaciones' },
```

El array queda así al final:
```ts
  { id: 'ia', label: 'IA en educación', iconName: 'Brain', path: 'ia-educacion' },
  { id: 'fotos', label: 'Fotos de Eventos', iconName: 'Image', path: 'fotos-eventos' },
  { id: 'aplicaciones', label: 'Aplicaciones', iconName: 'AppWindow', path: 'aplicaciones' },
  { id: 'claustro', label: 'Claustro Virtual', iconName: 'FileText', path: 'documentos-profesorado' }
```

- [ ] **Step 4: Añadir `hispa_apps` al array `keys` de `loadAllData`**

En la función `loadAllData` (línea ~212), el array `keys` queda:

```ts
  const keys = [
    'hispa_resources',
    'hispa_events',
    'hispa_nav',
    'hispa_sections',
    'hispa_dashboard_images',
    'hispa_apps',
  ];
```

- [ ] **Step 5: Añadir migración de nav y CRUD de apps al final del bloque `await Promise.all`**

Justo después del `await Promise.all(...)` en `loadAllData`, añadir la migración:

```ts
  // Migration: ensure 'aplicaciones' nav item exists in already-saved nav data
  const navItems = getFromStore<NavItem[]>('hispa_nav', INITIAL_NAV_ITEMS);
  if (!navItems.some(item => item.id === 'aplicaciones')) {
    saveToStore('hispa_nav', [
      ...navItems,
      { id: 'aplicaciones', label: 'Aplicaciones', iconName: 'AppWindow', path: 'aplicaciones' },
    ]);
  }
```

- [ ] **Step 6: Añadir las funciones CRUD de apps al final del archivo**

Después de `getAllCategories`, añadir:

```ts
// Apps
export const getApps = (): App[] => getFromStore<App[]>('hispa_apps', INITIAL_APPS);

export const addApp = (app: App): void => {
  const current = getApps();
  saveToStore('hispa_apps', [app, ...current]);
};

export const updateApp = (app: App): void => {
  const current = getApps();
  const index = current.findIndex(a => a.id === app.id);
  if (index !== -1) {
    const updated = [...current];
    updated[index] = app;
    saveToStore('hispa_apps', updated);
  }
};

export const deleteApp = (id: string): void => {
  const current = getApps();
  saveToStore('hispa_apps', current.filter(a => a.id !== id));
};
```

- [ ] **Step 7: Verificar compilación**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 8: Commit**

```bash
git add services/dataService.ts
git commit -m "feat(dataService): añadir seeds, CRUD y migración de nav para Apps"
```

---

## Task 3: Añadir tipo `app` al upload handler de `proxy-server.js`

**Files:**
- Modify: `proxy-server.js`

- [ ] **Step 1: Añadir el caso `app` en `handleUpload`**

En `proxy-server.js`, en la función `handleUpload`, localizar el bloque:

```js
  if (type === 'photo') {
    subDir = path.join('events', sanitize(eventSlug), sanitize(classSlug));
  } else if (type === 'dashboard') {
    subDir = 'dashboard';
  } else {
    subDir = path.join('resources', sanitize(category));
  }
```

Reemplazar por:

```js
  if (type === 'photo') {
    subDir = path.join('events', sanitize(eventSlug), sanitize(classSlug));
  } else if (type === 'dashboard') {
    subDir = 'dashboard';
  } else if (type === 'app') {
    subDir = 'apps';
  } else {
    subDir = path.join('resources', sanitize(category));
  }
```

- [ ] **Step 2: Commit**

```bash
git add proxy-server.js
git commit -m "feat(proxy): añadir soporte de upload type=app para imágenes de aplicaciones"
```

---

## Task 4: Crear `components/AppsView.tsx`

**Files:**
- Create: `components/AppsView.tsx`

- [ ] **Step 1: Crear el archivo con el componente completo**

```tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Plus, Pencil, Trash2, AppWindow } from 'lucide-react';
import { App, User } from '../types';
import { getApps, addApp, updateApp, deleteApp, AVAILABLE_COURSES, AVAILABLE_SUBJECTS } from '../services/dataService';

interface AppsViewProps {
  currentUser: User;
}

const slugify = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();

const processImage = (file: File, targetW: number, targetH: number): Promise<Blob> =>
  new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); resolve(new Blob()); };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;
      const imgRatio = img.width / img.height;
      const targetRatio = targetW / targetH;
      let drawW: number, drawH: number;
      if (imgRatio > targetRatio) { drawH = targetH; drawW = targetH * imgRatio; }
      else { drawW = targetW; drawH = targetW / imgRatio; }
      ctx.drawImage(img, (targetW - drawW) / 2, (targetH - drawH) / 2, drawW, drawH);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => resolve(b || new Blob()), 'image/jpeg', 0.85);
    };
    img.src = url;
  });

const EMPTY_FORM = {
  name: '',
  url: 'https://',
  description: '',
  accentColor: '#234B6E',
  tags: [] as string[],
  imageUrl: '',
};

export const AppsView: React.FC<AppsViewProps> = ({ currentUser }) => {
  const isAdmin = currentUser.role === 'admin';
  const [apps, setApps] = useState<App[]>([]);
  const [iframeApp, setIframeApp] = useState<App | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { setApps(getApps()); }, []);

  const refreshApps = () => setApps(getApps());

  const openAdd = () => {
    setEditingApp(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (app: App) => {
    setEditingApp(app);
    setForm({
      name: app.name,
      url: app.url,
      description: app.description,
      accentColor: app.accentColor || '#234B6E',
      tags: app.tags || [],
      imageUrl: app.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.url.trim()) return;
    const appData: App = {
      id: editingApp?.id || Math.random().toString(36).substring(2, 11),
      name: form.name.trim(),
      url: form.url.trim(),
      description: form.description.trim(),
      accentColor: form.accentColor,
      tags: form.tags,
      imageUrl: form.imageUrl || undefined,
    };
    if (editingApp) { updateApp(appData); } else { addApp(appData); }
    refreshApps();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, imageUrl?: string) => {
    if (imageUrl?.startsWith('/uploads/')) {
      fetch(`/api/file?path=${encodeURIComponent(imageUrl)}`, { method: 'DELETE' }).catch(() => {});
    }
    deleteApp(id);
    refreshApps();
    setDeleteConfirm(null);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const blob = await processImage(file, 800, 450);
    const filename = encodeURIComponent(`${slugify(form.name || 'app')}_${Date.now()}.jpg`);
    const res = await fetch('/api/upload?type=app', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'X-Filename': filename },
      body: blob,
    });
    const data = await res.json();
    if (data.success) setForm(f => ({ ...f, imageUrl: data.url }));
    setUploading(false);
  };

  const toggleTag = (tag: string) =>
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Aplicaciones</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Herramientas y programas para el aula</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-hispa-red text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={18} /> Añadir app
          </button>
        )}
      </div>

      {apps.length === 0 && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <AppWindow size={48} className="mx-auto mb-3 opacity-40" />
          <p>No hay aplicaciones disponibles todavía.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map(app => (
          <motion.div
            key={app.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Image / color banner */}
            <div
              className="relative w-full aspect-video flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: app.accentColor || '#234B6E' }}
            >
              {app.imageUrl
                ? <img src={app.imageUrl} alt={app.name} className="w-full h-full object-cover" />
                : <AppWindow size={48} className="text-white/50" />
              }
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="absolute top-2 right-2 p-1.5 bg-black/30 hover:bg-black/50 rounded-lg text-white transition-colors"
                title="Abrir en nueva pestaña"
              >
                <ExternalLink size={14} />
              </a>
              {isAdmin && (
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(app)} className="p-1.5 bg-black/30 hover:bg-black/50 rounded-lg text-white transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteConfirm(app.id)} className="p-1.5 bg-black/30 hover:bg-red-500/80 rounded-lg text-white transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{app.name}</h3>
              {app.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{app.description}</p>
              )}
              {app.tags && app.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {app.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={() => setIframeApp(app)}
                className="w-full py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: app.accentColor || '#234B6E' }}
              >
                Abrir
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Iframe Modal ── */}
      <AnimatePresence>
        {iframeApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/90"
          >
            <div className="flex items-center justify-between px-4 h-12 bg-zinc-900 shrink-0">
              <span className="text-white font-semibold truncate mr-4">{iframeApp.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={iframeApp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-300 hover:text-white transition-colors"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink size={18} />
                </a>
                <button onClick={() => setIframeApp(null)} className="p-1.5 text-gray-300 hover:text-white transition-colors" title="Cerrar">
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe
              src={iframeApp.url}
              title={iframeApp.name}
              className="flex-1 w-full border-0 bg-white"
              allow="fullscreen"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-bold dark:text-white mb-2">¿Eliminar aplicación?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Esta acción no se puede deshacer.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancelar</button>
                <button
                  onClick={() => handleDelete(deleteConfirm, apps.find(a => a.id === deleteConfirm)?.imageUrl)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold dark:text-white mb-4">
                {editingApp ? 'Editar aplicación' : 'Nueva aplicación'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                  <input
                    className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-2 dark:bg-zinc-800 dark:text-white"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre de la aplicación"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL *</label>
                  <input
                    type="url"
                    className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-2 dark:bg-zinc-800 dark:text-white"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                  <textarea
                    className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-2 dark:bg-zinc-800 dark:text-white resize-none"
                    rows={3}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="¿Para qué sirve esta aplicación?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color de acento</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{form.accentColor}</span>
                    <div className="flex-1 h-8 rounded-lg transition-colors" style={{ backgroundColor: form.accentColor }} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen (16:9)</label>
                  {form.imageUrl && (
                    <div className="relative mb-2 rounded-lg overflow-hidden aspect-video bg-gray-100 dark:bg-zinc-800">
                      <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-hispa-red file:text-white file:cursor-pointer disabled:opacity-50"
                    onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
                  />
                  {uploading && <span className="text-xs text-gray-400 mt-1 block">Subiendo imagen...</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Etiquetas</label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {[...AVAILABLE_COURSES, ...AVAILABLE_SUBJECTS].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                          form.tags.includes(tag)
                            ? 'bg-hispa-red text-white border-hispa-red'
                            : 'border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:border-hispa-red'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.name.trim() || !form.url.trim() || uploading}
                  className="px-4 py-2 bg-hispa-red text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {editingApp ? 'Guardar cambios' : 'Añadir aplicación'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

- [ ] **Step 2: Verificar compilación**

```bash
npx tsc --noEmit
```

Esperado: sin errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add components/AppsView.tsx
git commit -m "feat(AppsView): nuevo componente de aplicaciones con grid, iframe modal y CRUD admin"
```

---

## Task 5: Cablear `App.tsx`

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Añadir el import de `AppsView`**

En las primeras líneas de `App.tsx`, junto al resto de imports de componentes:

```ts
import { AppsView } from './components/AppsView';
```

- [ ] **Step 2: Añadir la ruta en `renderContent()`**

En `App.tsx`, en la función `renderContent()`, añadir la rama de `aplicaciones` **antes** del bloque `findPath`:

```ts
if (currentView === 'aplicaciones') {
  return <AppsView currentUser={user!} />;
}
```

El bloque queda así:
```ts
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
    // Dynamic routing lookup ...
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat(App): añadir ruta 'aplicaciones' en renderContent"
```

---

## Task 6: Verificación manual

- [ ] **Step 1: Arrancar el servidor de desarrollo**

En dos terminales separadas:

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
node proxy-server.js
```

O en una sola:
```bash
npm run dev & node proxy-server.js
```

- [ ] **Step 2: Verificar que la sección aparece en el sidebar**

Abrir `http://localhost:3010`. Hacer login. Comprobar que "Aplicaciones" aparece en el menú lateral con el icono de ventana de app.

- [ ] **Step 3: Verificar el grid de tarjetas**

Hacer clic en "Aplicaciones". Deben verse dos tarjetas: "Plik" (fondo `#234B6E`) y "Barcar" (fondo `#5D9BC9`) con sus descripciones y etiquetas.

- [ ] **Step 4: Verificar botón de nueva pestaña**

Hacer clic en el icono `ExternalLink` de la tarjeta de Plik. Debe abrirse `https://plik.bibliohispa.es` en una nueva pestaña.

- [ ] **Step 5: Verificar modal iframe**

Hacer clic en el botón "Abrir" de Barcar. Debe abrirse el modal a pantalla completa con una barra superior negra que muestra el nombre y los botones de nueva pestaña y cerrar.

- [ ] **Step 6: Verificar CRUD admin (requiere login con `direccion@colegiolahispanidad.es`)**

6a. Hacer clic en "Añadir app". Se abre el modal de formulario.  
6b. Rellenar nombre, URL, descripción, elegir un color, subir una imagen.  
6c. Guardar. La nueva tarjeta aparece en el grid.  
6d. Hacer hover sobre la tarjeta — deben aparecer los botones editar/eliminar en la esquina.  
6e. Editar la app y verificar que los cambios se persisten (recargar página y navegar de nuevo a Aplicaciones).  
6f. Eliminar la app y verificar que desaparece.

- [ ] **Step 7: Verificar persistencia**

Recargar la página. Las apps (incluyendo las editadas) deben seguir apareciendo correctamente gracias a `data/hispa_apps.json`.
