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

Production architecture: Cloudflare (HTTPS) → nginx :80 (reverse proxy) → PM2/vite-preview :3010 (serves `dist/`).

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

All persistence is via `localStorage` — there is no backend or API calls. Initial seed data is defined as constants (`INITIAL_RESOURCES`, `INITIAL_NAV_ITEMS`, etc.) and loaded on first run. The service exposes CRUD functions for:
- **Resources** (`hispa_resources`): educational materials with category, subject, and course tags
- **Events & Photos** (`hispa_events`): school events each containing class folders with photos
- **NavItems** (`hispa_nav`): the sidebar navigation tree (supports nested `children`)
- **Sections** (`hispa_sections`): section header metadata (title + description)
- **Session** (`hispanidad_user`): objeto `User` serializado, gestionado por `authService.ts`

### Authentication (`services/authService.ts`)

Uses **Google Identity Services (GIS)** for OAuth. The login flow is:
1. `Login.tsx` loads the GIS script and renders the official Google Sign-In button via `google.accounts.id.renderButton`.
2. On success, the Google JWT credential is decoded (`decodeJwt`) to extract the email.
3. Domain check: must be `@colegiolahispanidad.es` — also enforced at the Google picker level via `hosted_domain`.
4. The email is validated against the teacher list from `VITE_PRISMA_API_URL` (API key in `Authorization: Bearer` and `x-api-key` headers).
5. Session stored as `hispanidad_user` in localStorage.

**Roles:**
- `admin`: only `direccion@colegiolahispanidad.es`
- `teacher`: any other authorized email in the Prisma list

If the Prisma API response format changes, adjust `fetchAuthorizedEmails` in `authService.ts`. Currently supports root array, `{ users: [] }`, and `{ data: [] }` shapes.

**`handleLogin` en `App.tsx`** recibe un objeto `User` completo (no un email string, no es async). Es `Login.tsx` quien ejecuta todo el flujo asíncrono y llama a `onLogin(user)` solo tras validar correctamente.

El script de Google Identity Services se carga **dinámicamente** en `Login.tsx` (no está en `index.html`). Si se quiere precargar, añadir `<script src="https://accounts.google.com/gsi/client" async defer></script>` en el `<head>` de `index.html`.

### Role-based permissions

In `SectionView.tsx`, the constant `TEACHER_ALLOWED_SECTIONS` lists which sections teachers can upload to. Admins can upload/edit/delete everywhere and can also edit section headers (title/description inline) and create new nav sections via the modal in `App.tsx`.

### Theming

Brand colors are defined in `index.html` inside the inline `tailwind.config` script:
- `hispa-red`: `#234B6E` (dark slate blue, used for primary buttons/accents)
- `hispa-blue`: `#5D9BC9` (lighter blue, secondary accent)

Dark mode uses Tailwind's `class` strategy. `App.tsx` manages toggling the `dark` class on `<html>` based on the `ThemeMode` state (`'light' | 'dark' | 'system'`).

### NavItem icons

`NavItem.iconName` stores a Lucide icon name as a string (e.g. `'Home'`, `'Brain'`). The `Sidebar` component resolves this string to the actual Lucide component at render time.

### Resource search (SectionView)

When no search is active, `SectionView` shows only resources where `resource.category === sectionId`. When a search term or tag is active, it searches **all** resources across all sections (global search). Tag-based filtering (by course or subject) uses intersection logic — all selected tags must match.
