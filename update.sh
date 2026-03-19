#!/bin/bash
# =============================================================
#  Intranet Colegio La Hispanidad — Script de actualización
#
#  Uso: sudo bash update.sh
#  Actualiza el repositorio donde está este script.
# =============================================================
set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

# ── Directorio de la aplicación = donde está este script ───
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="intranet-hispa"

[ "$EUID" -ne 0 ] && echo -e "\033[0;31m[✗]\033[0m Ejecuta como root: sudo bash update.sh" && exit 1
[ ! -f "$APP_DIR/package.json" ] && echo -e "\033[0;31m[✗]\033[0m No se encontró package.json en $APP_DIR." && exit 1

echo ""
echo -e "${BLUE}[→]${NC} Actualizando Intranet Hispanidad..."
echo -e "${BLUE}[→]${NC} Directorio: ${APP_DIR}"
echo ""

cd "$APP_DIR"

# ── 1. Obtener últimos cambios ─────────────────────────────
info "Descargando últimos cambios desde GitHub..."
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  warn "Ya estás en la última versión ($(git log -1 --format='%h %s'))."
  warn "Forzando rebuild y reinicio de todas formas..."
fi

git pull origin main
log "Código actualizado: $(git log -1 --format='%h %s')"

# ── 2. Dependencias ───────────────────────────────────────
info "Comprobando dependencias npm..."
npm install --silent
log "Dependencias OK"

# ── 3. Build ──────────────────────────────────────────────
info "Compilando..."
npm run build
log "Build completado"

# ── 4. Parchear nginx si faltan rutas al proxy ─────────────
NGINX_CONF="/etc/nginx/sites-available/intranet-hispa"
NGINX_CHANGED=0

if [ -f "$NGINX_CONF" ]; then
  if ! grep -q "location /api/data" "$NGINX_CONF"; then
    info "Añadiendo /api/data a nginx..."
    sed -i '/location \/uploads\//i\    location /api/data {\n        proxy_pass http://127.0.0.1:3011;\n        proxy_read_timeout 10s;\n    }\n' "$NGINX_CONF"
    NGINX_CHANGED=1
  fi
  if ! grep -q "location /api/file" "$NGINX_CONF"; then
    info "Añadiendo /api/file a nginx..."
    sed -i '/location \/api\/data/i\    location /api/file {\n        proxy_pass http://127.0.0.1:3011;\n    }\n' "$NGINX_CONF"
    NGINX_CHANGED=1
  fi
  if [ "$NGINX_CHANGED" = "1" ]; then
    nginx -t && systemctl reload nginx
    log "Nginx actualizado y recargado"
  else
    log "Nginx ya tiene todas las rutas necesarias"
  fi
else
  warn "No se encontró $NGINX_CONF — omitiendo parche de nginx"
fi

# ── 5. Reiniciar proceso PM2 ──────────────────────────────
info "Reiniciando procesos PM2..."
if pm2 describe "$APP_NAME" &>/dev/null; then
  pm2 reload ecosystem.config.cjs --update-env
  log "Procesos recargados sin downtime"
else
  warn "Procesos no encontrados en PM2. Arrancando desde el ecosistema..."
  pm2 start ecosystem.config.cjs
  pm2 save
  log "Procesos arrancados"
fi

echo ""
echo -e "${GREEN}✅ Actualización completada${NC}"
echo ""
pm2 status "$APP_NAME"
echo ""
