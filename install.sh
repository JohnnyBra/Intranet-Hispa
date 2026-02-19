#!/bin/bash
# =============================================================
#  Intranet Colegio La Hispanidad — Script de instalación
#  VPS Ubuntu/Debian + Cloudflare + PM2
#
#  Uso: sudo bash install.sh
#  Se instala en el mismo directorio donde está este script.
# =============================================================
set -euo pipefail

# ── Colores ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Directorio de la aplicación = donde está este script ───
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="intranet-hispa"
APP_PORT=3010
PRISMA_URL="https://prisma.bibliohispa.es/api/export/users"
PRISMA_KEY="ojosyculos"

# ── Comprobaciones previas ─────────────────────────────────
[ "$EUID" -ne 0 ] && err "Ejecuta como root: sudo bash install.sh"
[ ! -f "$APP_DIR/package.json" ] && err "No se encontró package.json en $APP_DIR. Ejecuta este script desde la raíz del repositorio."

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Intranet Hispanidad — Instalación VPS      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Directorio: ${BLUE}${APP_DIR}${NC}"
echo ""

# ── 1. Paquetes del sistema ────────────────────────────────
info "Actualizando paquetes del sistema..."
apt-get update -qq
apt-get install -y -qq curl git nginx
log "Paquetes del sistema listos"

# ── 2. Node.js 20 LTS ─────────────────────────────────────
if ! command -v node &>/dev/null; then
  info "Instalando Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs
  log "Node.js $(node -v) instalado"
else
  log "Node.js ya instalado: $(node -v)"
fi

# ── 3. PM2 ────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  info "Instalando PM2..."
  npm install -g pm2 --silent
  log "PM2 $(pm2 -v) instalado"
else
  log "PM2 ya instalado: $(pm2 -v)"
fi

# ── 4. Variables de entorno ───────────────────────────────
if [ ! -f "$APP_DIR/.env.local" ]; then
  echo ""
  warn "Se necesita el Google OAuth Client ID."
  warn "Encuéntralo en: https://console.cloud.google.com → APIs & Services → Credentials"
  echo ""
  read -rp "  VITE_GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
  echo ""

  cat > "$APP_DIR/.env.local" <<EOF
VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
VITE_PRISMA_API_URL=${PRISMA_URL}
VITE_PRISMA_API_KEY=${PRISMA_KEY}
EOF
  log ".env.local creado"
else
  warn ".env.local ya existe — se conserva sin cambios"
fi

# ── 5. Dependencias npm ───────────────────────────────────
info "Instalando dependencias npm..."
cd "$APP_DIR"
npm install --silent
log "Dependencias instaladas"

# ── 6. Build de producción ────────────────────────────────
info "Compilando la aplicación..."
npm run build
log "Build completado → dist/"

# ── 7. Configurar nginx ───────────────────────────────────
echo ""
read -rp "Dominio de la intranet (ej: intranet.colegiolahispanidad.es): " DOMAIN
echo ""

NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

cat > "$NGINX_CONF" <<NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};

    # IPs reales de Cloudflare (proxy mode)
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    real_ip_header CF-Connecting-IP;

    # Proxy hacia Prisma EDU a través del servidor Node.js local (puerto 3011)
    # Evita CORS desde el navegador y problemas de SSL en proxy nginx→HTTPS externo
    location = /api/prisma-users {
        proxy_pass http://127.0.0.1:3011;
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINXEOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/"$APP_NAME"
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
log "Nginx configurado → ${DOMAIN}:80 → 127.0.0.1:${APP_PORT}"

# ── 8. Arrancar con PM2 ───────────────────────────────────
info "Arrancando la app con PM2..."
cd "$APP_DIR"

pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
log "PM2 arrancado: proceso '$APP_NAME'"

# ── 9. PM2 en el arranque del sistema ─────────────────────
info "Registrando PM2 como servicio systemd..."
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root | grep "sudo env" | bash || true
pm2 save
log "PM2 se iniciará automáticamente al reiniciar el servidor"

# ── Resumen final ─────────────────────────────────────────
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "<IP del VPS>")

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅  Instalación completada correctamente        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Directorio:      ${BLUE}${APP_DIR}${NC}"
echo -e "  App interna:     ${BLUE}http://127.0.0.1:${APP_PORT}${NC}"
echo -e "  Dominio público: ${BLUE}https://${DOMAIN}${NC}  (vía Cloudflare)"
echo ""
echo -e "  ${YELLOW}Pasos pendientes en Cloudflare:${NC}"
echo -e "  1. Registro DNS A: ${DOMAIN} → ${VPS_IP}"
echo -e "  2. Proxy: activado (nube naranja)"
echo -e "  3. SSL/TLS → modo: Flexible"
echo ""
echo -e "  ${YELLOW}Pasos pendientes en Google Cloud Console:${NC}"
echo -e "  1. APIs & Services → Credentials → tu OAuth Client ID"
echo -e "  2. Authorized JavaScript Origins → añadir: https://${DOMAIN}"
echo ""
echo -e "  Comandos útiles:"
echo -e "  ${BLUE}pm2 status${NC}                        — estado del proceso"
echo -e "  ${BLUE}pm2 logs $APP_NAME${NC}                — logs en tiempo real"
echo -e "  ${BLUE}sudo bash ${APP_DIR}/update.sh${NC}    — actualizar"
echo ""
