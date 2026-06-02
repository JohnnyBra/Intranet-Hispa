# Sección Aplicaciones — Spec de diseño

**Fecha:** 2026-06-02  
**Estado:** Aprobado

---

## Resumen

Nueva sección principal "Aplicaciones" en la intranet del Colegio La Hispanidad. Muestra un catálogo visual de aplicaciones web educativas. Los administradores pueden añadir, editar y eliminar apps (incluyendo imágenes). Las apps se abren en un modal con iframe o en nueva pestaña.

---

## Modelo de datos

### Tipo `App` (nuevo en `types.ts`)

```ts
export interface App {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl?: string;    // ruta /uploads/apps/... o URL externa
  accentColor?: string; // hex, e.g. "#234B6E"
  tags?: string[];      // mezcla libre de cursos y asignaturas
}
```

### Persistencia

- Clave: `hispa_apps`
- Archivo servidor: `data/hispa_apps.json`
- Gestionado por `dataService.ts` (mismo patrón que `hispa_resources`, `hispa_events`, etc.)

### Seeds iniciales

```ts
const INITIAL_APPS: App[] = [
  {
    id: 'plik',
    name: 'Plik',
    description: 'Evaluaciones y coevaluaciones al estilo Plickers/Kahoot. Lanza preguntas en tiempo real y recoge respuestas del aula.',
    url: 'https://plik.bibliohispa.es',
    accentColor: '#234B6E',
    tags: ['General']
  },
  {
    id: 'barcar',
    name: 'Barcar',
    description: 'Hundir la flota multijugador para practicar coordenadas cartesianas. Ideal para 6º Primaria y 1º ESO.',
    url: 'https://barcar.bibliohispa.es',
    accentColor: '#5D9BC9',
    tags: ['6º Primaria', '1º ESO', 'Matemáticas']
  }
];
```

### Funciones nuevas en `dataService.ts`

- `getApps(): App[]`
- `saveApps(apps: App[]): void`
- `addApp(app: App): void`
- `updateApp(app: App): void`
- `deleteApp(id: string): void`

---

## Arquitectura de componentes

### Nuevo componente: `components/AppsView.tsx`

Vista principal de aplicaciones. Responsabilidades:
- Renderizar el grid de tarjetas de apps
- Gestionar el modal iframe
- Panel admin (añadir/editar/eliminar apps)

### Ruta en `App.tsx`

```ts
if (currentView === 'aplicaciones') {
  return <AppsView currentUser={user!} />;
}
```

Añadida en `renderContent()` antes del bloque de `findPath`.

### NavItem seed

El NavItem de "Aplicaciones" se añade a `INITIAL_NAV_ITEMS` en `dataService.ts`:

```ts
{ id: 'aplicaciones', label: 'Aplicaciones', iconName: 'AppWindow', path: 'aplicaciones' }
```

---

## UI — Vista principal (grid)

- Grid responsive: 1 col móvil / 2 col tablet / 3 col desktop
- Cada tarjeta muestra:
  - Imagen (aspect 16/9) — si no hay imagen, fondo sólido con `accentColor`
  - Nombre de la app
  - Descripción (máx. 2 líneas, truncado con `line-clamp-2`)
  - Chips de etiquetas (cursos/asignaturas)
  - Botón "Abrir" → abre modal iframe
  - Icono `ExternalLink` (esquina superior derecha de la tarjeta) → nueva pestaña
  - En hover (admin): botones Editar / Eliminar, con el mismo patrón de `opacity-0 group-hover:opacity-100` que `ResourceCard`

---

## UI — Modal iframe

- Overlay oscuro a pantalla completa (`fixed inset-0 bg-black/70 z-50`)
- Barra superior fina con: nombre de la app + icono `ExternalLink` (abre en nueva pestaña) + botón `X` (cierra modal)
- `<iframe>` al 100% del espacio restante (`h-[calc(100%-3rem)]`)
- Si el iframe es bloqueado por X-Frame-Options: mostrar mensaje de error con enlace directo a la URL

---

## UI — Panel admin (modal añadir/editar)

Campos del formulario:
- **Nombre** — text input, requerido
- **URL** — text input, requerido (debe empezar por `https://`)
- **Descripción** — textarea
- **Color de acento** — `<input type="color">` con preview
- **Etiquetas** — multiselect de `AVAILABLE_COURSES` + `AVAILABLE_SUBJECTS`
- **Imagen** — upload de archivo (→ `/api/upload?type=app`) o URL externa; preview en vivo

Botón "Eliminar app" (solo en modo edición, admin) con confirmación.

---

## Infraestructura de upload

### Nuevo tipo `app` en `proxy-server.js`

```
type=app → uploads/apps/{nameSlug}_{timestamp}.ext
```

- Procesado como el resto: el cliente calcula el nombre significativo y lo envía en `X-Filename`
- El servidor lo guarda en `uploads/apps/` (directorio creado si no existe)

### Delete

Usa el endpoint existente `DELETE /api/file?path=...` sin modificaciones.

---

## Permisos

- **Todos los usuarios autenticados**: pueden ver la sección y abrir apps
- **Admin únicamente**: puede añadir, editar y eliminar apps

---

## Archivos a crear o modificar

| Archivo | Cambio |
|---|---|
| `types.ts` | Añadir interfaz `App` |
| `services/dataService.ts` | Seeds + funciones CRUD para `hispa_apps`; añadir `aplicaciones` a `INITIAL_NAV_ITEMS` |
| `components/AppsView.tsx` | Nuevo componente (grid + modal iframe + panel admin) |
| `App.tsx` | Importar `AppsView`; añadir rama `'aplicaciones'` en `renderContent()` |
| `proxy-server.js` | Añadir caso `type=app` en el handler de `/api/upload` |
