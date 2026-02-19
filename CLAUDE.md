# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:3010
npm run build     # Production build
npm run preview   # Serve dist/ on port 3010 (used by PM2 in production)
```

There are no tests configured in this project.

## Production deployment

Scripts in the repo root:
- **`install.sh`** — full VPS setup (Ubuntu/Debian): installs Node 20, PM2, nginx, clones repo, builds, configures nginx reverse proxy, starts PM2 and registers it as a systemd service. Run as root.
- **`update.sh`** — pulls latest `main`, reinstalls deps, rebuilds, reloads PM2 without downtime.
- **`ecosystem.config.cjs`** — PM2 ecosystem file. Runs `npm run preview` (serves `dist/`) on port 3010. Uses `.cjs` extension because `package.json` has `"type": "module"`.

Production architecture: Cloudflare (HTTPS) → nginx :80 (reverse proxy) → PM2/vite-preview :3010 (serves `dist/`) + PM2/proxy-server.js :3011 (Prisma proxy + file upload + static `/uploads/` serving).

Both `server` and `preview` sections in `vite.config.ts` are set to `port: 3010, host: '0.0.0.0'` so dev and preview use the same port.

## Environment variables

Copy `.env.example` to `.env.local` (already gitignored via `*.local`) and fill in the values:

| Variable | Description |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID (Google Cloud Console) |
| `VITE_PRISMA_API_URL` | Endpoint del directorio de profesores |
| `VITE_PRISMA_API_KEY` | Clave de la API de Prisma |

All `VITE_` prefixed variables are embedded in the client bundle at build time — no runtime secrets.

### Google Cloud Console setup (required)

In the OAuth Client ID configuration add these **Authorized JavaScript origins**:
- `http://localhost:3010` (desarrollo)
- La URL de producción cuando se despliegue

Sin esto, Google rechaza el login con error `origin_mismatch`.

## Architecture

**Stack:** React 19 + TypeScript + Vite 6. Styling via Tailwind CSS loaded from CDN (`index.html`), not via PostCSS/npm. Animations with Framer Motion.

### Navigation (no router library)

Routing is purely state-based. `App.tsx` holds a `currentView: string` state. Components call `onNavigate(path)` to change views. The render logic in `renderContent()` maps view strings to components:
- `'dashboard'` → `<Dashboard>`
- `'fotos-eventos'` → `<EventsView>`
- Any other string matching a `NavItem.path` → `<SectionView sectionId={currentView}>`

### Data Layer (`services/dataService.ts`)

Metadata is persisted in `localStorage`. Uploaded files (resources, photos, dashboard images) are stored on the server filesystem via `proxy-server.js`. Initial seed data is defined as constants (`INITIAL_RESOURCES`, `INITIAL_NAV_ITEMS`, etc.) and loaded on first run. The service exposes CRUD functions for:
- **Resources** (`hispa_resources`): educational materials with category, subject, and course tags. The `url` field holds either an external URL or a server path (`/uploads/resources/{category}/...`).
- **Events & Photos** (`hispa_events`): school events each containing class folders with photos. Photo `url` is a server path (`/uploads/events/{eventId}/{folderId}/...`). Legacy entries may still hold base64 data URLs.
- **NavItems** (`hispa_nav`): the sidebar navigation tree (supports nested `children`)
- **Sections** (`hispa_sections`): section header metadata (title + description)
- **Dashboard images** (`hispa_dashboard_images`): stores server paths (`/uploads/dashboard/{key}.jpg`) for the hero banner and quick-access cards. Falls back to picsum URLs if not set.
- **Session** (`hispanidad_user`): objeto `User` serializado, gestionado por `authService.ts`

### File upload (`proxy-server.js` + `/api/upload`)

Uploaded files are saved to `uploads/` in the app root (gitignored, persists across `git pull`/`update.sh`).

**Folder structure and naming conventions:**
```
uploads/
  resources/{category}/{tituloSlug}_{timestamp}.ext
      e.g. resources/infantil/grafomotricidad_para_3_anos_1712345678.pdf

  events/{eventoSlug}/{claseSlug}/{eventoSlug}_{claseSlug}_{001}.ext
      e.g. events/navidad_2025/3_anos_infantil_a/navidad_2025_3_anos_infantil_a_003.jpg

  dashboard/{key}.jpg   (overwritten on each update)
      e.g. dashboard/hero.jpg, dashboard/card-aulas.jpg
```

**`slugify` helper** (defined in `EventsView.tsx` and `SectionView.tsx`):
Strips accents → removes non-alphanumeric → lowercases. Example: `"3 años Infantil A"` → `"3_anos_infantil_a"`.

**Upload API — `POST /api/upload`** (handled by `proxy-server.js` on port 3011):
- Body: raw binary file
- Headers: `Content-Type` (MIME type), `X-Filename` (URL-encoded, meaningful filename computed by the client)
- The server uses `X-Filename` as-is (after sanitization); the client is responsible for providing readable, unique names
- Query params determine routing:

| Param | Values | Effect |
|---|---|---|
| `type` | `resource` (default) | saved to `uploads/resources/{category}/` |
| `type` | `photo` | saved to `uploads/events/{eventSlug}/{classSlug}/` |
| `type` | `dashboard` | saved to `uploads/dashboard/`, filename = `{key}.jpg` (overwrites) |
| `category` | section id | subfolder for resources |
| `eventId`, `folderId` | event/folder ids | used to update localStorage after upload |
| `eventSlug`, `classSlug` | slugified event/class names | readable folder path for photos |
| `key` | e.g. `hero`, `card-aulas` | filename for dashboard images |

**Client-side naming logic:**
- **Photos** (`EventsView.tsx`): `{eventoSlug}_{claseSlug}_{NNN}.ext` — `NNN` is zero-padded 3-digit sequence starting from `currentFolder.photos.length + 1`. Parallel uploads in the same batch use `baseIndex + i`.
- **Resources** (`SectionView.tsx`): `{tituloSlug}_{Date.now()}.ext` — title slug + Unix timestamp for uniqueness.
- **Dashboard** (`Dashboard.tsx`): key-based name (e.g. `hero.jpg`) — always overwrites.

- Returns: `{ success: true, url: "/uploads/..." }` or `{ success: false, message: "..." }`

**Static serving — `GET /uploads/*`**: `proxy-server.js` reads and streams the file with correct `Content-Type`. In dev, Vite proxies `/uploads` → port 3011. In production, nginx proxies `/uploads/` → port 3011.

**File delete — `DELETE /api/file?path=...`** (handled by `proxy-server.js`):
- Deletes a previously uploaded file from the server filesystem.
- `path` must start with `/uploads/`; the server resolves it and validates it stays inside `UPLOADS_DIR` (path-traversal guard).
- Called automatically by `handleDeleteResource` (SectionView) and `handleDeletePhoto` (EventsView) when the resource/photo URL starts with `/uploads/`. External URLs (links) have no file to delete and are skipped.

**Proxy routes (full table):**
| Route | Dev (Vite proxy) | Prod (nginx → proxy-server.js :3011) | Upstream |
|---|---|---|---|
| `GET /api/prisma-users` | ✓ | ✓ | `prisma.bibliohispa.es/api/export/users` |
| `POST /api/prisma-auth` | ✓ | ✓ | `prisma.bibliohispa.es/api/auth/external-check` |
| `POST /api/upload` | ✓ | ✓ (50M body limit) | local filesystem |
| `DELETE /api/file` | ✓ | ✓ | local filesystem |
| `GET /uploads/*` | ✓ | ✓ | local filesystem |

**Dev note:** in development you must run `node proxy-server.js` alongside `npm run dev` for file uploads and serving to work. In production PM2 starts both processes via `ecosystem.config.cjs`.

### Authentication (`services/authService.ts`)

Two login methods are supported, both exposed via `Login.tsx`:

#### 1. Google OAuth (docentes)
Uses **Google Identity Services (GIS)**. Flow:
1. `Login.tsx` loads the GIS script and renders the official Google Sign-In button via `google.accounts.id.renderButton`.
2. On success, the Google JWT is verified against `https://oauth2.googleapis.com/tokeninfo`.
3. Domain check: must be `@colegiolahispanidad.es` — also enforced at the Google picker level via `hosted_domain`.
4. The email is validated against the teacher list from `/api/prisma-users` (proxied to `prisma.bibliohispa.es/api/export/users`).
5. Session stored as `hispanidad_user` in localStorage.

#### 2. PIN login (admin only)
`direccion@colegiolahispanidad.es` can log in with their Prisma PIN instead of Google. Flow:
1. User clicks "Acceso Dirección (PIN)" link on the login screen.
2. Enters their PIN; `loginWithPin(pin)` in `authService.ts` calls `POST /api/prisma-auth`.
3. The proxy forwards the request to `prisma.bibliohispa.es/api/auth/external-check` with `{ username: "direccion@colegiolahispanidad.es", password: pin }`.
4. Prisma responds `{ success: true, name, ... }` on success.
5. Session stored with `role: 'admin'`.

In production nginx routes `/api/prisma-users` and `/api/prisma-auth` to `proxy-server.js` on port 3011. The Vite dev proxy handles both in development. See the full proxy routes table in the **File upload** section above.

**Roles:**
- `admin`: only `direccion@colegiolahispanidad.es`
- `teacher`: any other authorized email in the Prisma list

If the Prisma API response format changes, adjust `fetchAuthorizedEmails` in `authService.ts`. Currently supports root array, `{ users: [] }`, and `{ data: [] }` shapes.

**`handleLogin` en `App.tsx`** recibe un objeto `User` completo (no un email string, no es async). Es `Login.tsx` quien ejecuta todo el flujo asíncrono y llama a `onLogin(user)` solo tras validar correctamente.

El script de Google Identity Services se carga **dinámicamente** en `Login.tsx` (no está en `index.html`). Si se quiere precargar, añadir `<script src="https://accounts.google.com/gsi/client" async defer></script>` en el `<head>` de `index.html`.

### Role-based permissions

In `SectionView.tsx`, the constant `TEACHER_ALLOWED_SECTIONS` lists which sections teachers can upload to. Admins can upload/edit/delete everywhere and can also edit section headers (title/description inline) and create new nav sections via the modal in `App.tsx`.

**Admin delete actions:**
- **Resources**: `handleDeleteResource` in `SectionView.tsx` calls `DELETE /api/file` (if URL is a server path) then `deleteResource(id)`. Edit/delete buttons on `ResourceCard` are always visible on mobile (`opacity-100 md:opacity-0 md:group-hover:opacity-100`).
- **Photos**: `handleDeletePhoto` in `EventsView.tsx` calls `DELETE /api/file` then `deletePhotoFromEvent`. Adjusts the lightbox index if the lightbox is open. Trash button appears in the photo hover overlay (admin only).

### React state and the dataService mutation pitfall

`dataService` stores data in a plain JS object (`store`). `getFromStore` returns a **direct reference** to the stored value, not a copy. If a mutation function modifies the stored object in-place (e.g. `array[i] = newItem`) and then `saveToStore` assigns the same reference back, React's `Object.is` bail-out will prevent re-renders when `setState` is called with that same reference.

**Rules followed to avoid this:**
- `addResource` and `deleteResource` create new arrays (`[item, ...arr]` / `arr.filter(...)`). ✅
- `updateResource` spreads into a new array (`[...current]`) before modifying. ✅
- `addPhotoToEvent` and `deletePhotoFromEvent` also keep the store events array reference stable, so components **must not** read back from the store and pass the result to `setState` directly. Instead, build fresh object references in the component using spread/map/filter before calling `setState`. ✅ (see `handlePhotoUpload` and `handleDeletePhoto` in `EventsView.tsx`)

### Theming

Brand colors are defined in `index.html` inside the inline `tailwind.config` script:
- `hispa-red`: `#234B6E` (dark slate blue, used for primary buttons/accents)
- `hispa-blue`: `#5D9BC9` (lighter blue, secondary accent)

Dark mode uses Tailwind's `class` strategy. `App.tsx` manages toggling the `dark` class on `<html>` based on the `ThemeMode` state (`'light' | 'dark' | 'system'`).

### NavItem icons

`NavItem.iconName` stores a Lucide icon name as a string (e.g. `'Home'`, `'Brain'`). The `Sidebar` component resolves this string to the actual Lucide component at render time.

### Resource search (SectionView)

When no search is active, `SectionView` shows only resources where `resource.category === sectionId`. When a search term or tag is active, it searches **all** resources across all sections (global search). Tag-based filtering (by course or subject) uses intersection logic — all selected tags must match.
