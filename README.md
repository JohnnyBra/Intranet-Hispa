# Intranet Colegio La Hispanidad

Intranet privada para el profesorado del Colegio La Hispanidad. Acceso restringido a cuentas `@colegiolahispanidad.es` validadas contra el directorio de Prisma.

**Stack:** React 19 + TypeScript + Vite 6 · Auth: Google Identity Services · Datos: localStorage

---

## Tabla de contenidos

- [Desarrollo local](#desarrollo-local)
- [Despliegue en VPS con Cloudflare](#despliegue-en-vps-con-cloudflare)
  - [Requisitos previos](#requisitos-previos)
  - [Instalación](#instalación)
  - [Actualización](#actualización)
- [Configuración de Cloudflare](#configuración-de-cloudflare)
- [Configuración de Google Cloud Console](#configuración-de-google-cloud-console)
- [Variables de entorno](#variables-de-entorno)
- [Gestión con PM2](#gestión-con-pm2)

---

## Desarrollo local

**Requisitos:** Node.js 20+

```bash
git clone https://github.com/JohnnyBra/Intranet-Hispa
cd Intranet-Hispa

# Copiar y rellenar variables de entorno
cp .env.example .env.local
# → edita .env.local con tu VITE_GOOGLE_CLIENT_ID

npm install
npm run dev        # http://localhost:3010
```

---

## Despliegue en VPS con Cloudflare

### Arquitectura

```
Usuario (HTTPS)
      │
  Cloudflare  ←── proxy + SSL termination
      │  (HTTP)
   Nginx :80  ←── reverse proxy
      │
 PM2 / Vite Preview :3010  ←── dist/ estático
```

### Requisitos previos

- VPS con **Ubuntu 22.04 / 24.04** (o Debian 12) y acceso root
- Dominio gestionado en **Cloudflare**
- **Google OAuth Client ID** (ver [Configuración de Google Cloud Console](#configuración-de-google-cloud-console))

---

### Instalación

Conecta al VPS por SSH, clona el repositorio en el directorio que quieras y ejecuta el script desde ahí:

```bash
git clone https://github.com/JohnnyBra/Intranet-Hispa /ruta/donde/quieras
cd /ruta/donde/quieras
sudo bash install.sh
```

El script se instala **en el mismo directorio donde está `install.sh`**, sin rutas hardcodeadas. El script realiza automáticamente:

| Paso | Acción |
|------|--------|
| 1 | Actualiza paquetes e instala `git`, `nginx` |
| 2 | Instala **Node.js 20 LTS** vía NodeSource |
| 3 | Instala **PM2** globalmente |
| 4 | Crea `.env.local` (te pedirá el Google Client ID) |
| 5 | `npm install` + `npm run build` |
| 6 | Configura **nginx** como reverse proxy (te pedirá el dominio) |
| 7 | Arranca la app con **PM2** (`ecosystem.config.cjs`) |
| 8 | Registra PM2 como servicio **systemd** (persiste tras reinicios) |

---

### Actualización

Desde el directorio del repositorio:

```bash
sudo bash /ruta/donde/instalaste/update.sh
```

O directamente:

```bash
cd /ruta/donde/instalaste
git pull origin main && npm install && npm run build && pm2 reload intranet-hispa
```

El script de actualización:
1. Descarga los últimos cambios de `main`
2. Reinstala dependencias si cambiaron
3. Recompila la aplicación
4. Recarga PM2 **sin downtime** (`pm2 reload`)

---

## Configuración de Cloudflare

En el panel de Cloudflare del dominio:

### DNS

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| A | `intranet` | `<IP pública del VPS>` | Activado (nube naranja) |

> Sustituye `intranet` por el subdominio que hayas elegido.

### SSL/TLS

Ve a **SSL/TLS → Overview** y selecciona el modo **Flexible**.

> Con modo Flexible, Cloudflare hace HTTPS con el cliente y HTTP con el VPS. No se necesita certificado en el servidor.
>
> Si prefieres modo **Full (strict)**, instala un certificado en el VPS con:
> ```bash
> apt install certbot python3-certbot-nginx
> certbot --nginx -d tu-dominio.com
> ```

### Reglas de firewall recomendadas (opcional)

Para que sólo Cloudflare pueda acceder al puerto 80 del VPS:

```bash
# Permitir sólo IPs de Cloudflare en el puerto 80
ufw allow ssh
ufw allow from 173.245.48.0/20 to any port 80
ufw allow from 103.21.244.0/22 to any port 80
ufw allow from 103.22.200.0/22 to any port 80
ufw allow from 103.31.4.0/22 to any port 80
ufw allow from 104.16.0.0/13 to any port 80
ufw allow from 104.24.0.0/14 to any port 80
ufw allow from 108.162.192.0/18 to any port 80
ufw allow from 141.101.64.0/18 to any port 80
ufw allow from 162.158.0.0/15 to any port 80
ufw allow from 172.64.0.0/13 to any port 80
ufw allow from 188.114.96.0/20 to any port 80
ufw allow from 190.93.240.0/20 to any port 80
ufw allow from 197.234.240.0/22 to any port 80
ufw allow from 198.41.128.0/17 to any port 80
ufw allow from 131.0.72.0/22 to any port 80
ufw deny 80
ufw enable
```

---

## Configuración de Google Cloud Console

La autenticación usa **Google Identity Services**. Cada vez que cambies el dominio de la intranet debes actualizar esto.

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services → Credentials → tu OAuth 2.0 Client ID**
3. En **Authorized JavaScript Origins** añade:
   - `http://localhost:3010` — para desarrollo local
   - `https://intranet.colegiolahispanidad.es` — dominio de producción

> Sin esto el login falla con error `origin_mismatch`.

---

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores:

```bash
cp .env.example .env.local
```

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google OAuth | `123456789.apps.googleusercontent.com` |
| `VITE_PRISMA_API_URL` | Endpoint del directorio de profesores | `https://prisma.bibliohispa.es/api/export/users` |
| `VITE_PRISMA_API_KEY` | Clave de la API de Prisma | — |

> Las variables `VITE_` se incrustan en el bundle en tiempo de compilación. Cambia el `.env.local` y ejecuta `npm run build` para que los cambios surtan efecto.

---

## Gestión con PM2

```bash
pm2 status                        # Estado de todos los procesos
pm2 logs intranet-hispa           # Logs en tiempo real
pm2 logs intranet-hispa --lines 100  # Últimas 100 líneas
pm2 reload intranet-hispa         # Reinicio sin downtime
pm2 restart intranet-hispa        # Reinicio completo
pm2 stop intranet-hispa           # Detener
pm2 delete intranet-hispa         # Eliminar proceso
pm2 save                          # Guardar config para el arranque automático
```

### Ubicaciones

| Elemento | Ruta |
|----------|------|
| Aplicación | `/var/www/intranet-hispa/` |
| Build estático | `/var/www/intranet-hispa/dist/` |
| Variables de entorno | `/var/www/intranet-hispa/.env.local` |
| Config PM2 | `/var/www/intranet-hispa/ecosystem.config.cjs` |
| Config nginx | `/etc/nginx/sites-available/intranet-hispa` |
| Logs PM2 | `~/.pm2/logs/` |
