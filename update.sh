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

# ── 4. Reiniciar proceso PM2 ──────────────────────────────
info "Reiniciando proceso PM2..."
if pm2 describe "$APP_NAME" &>/dev/null; then
  pm2 reload "$APP_NAME"
  log "Proceso '$APP_NAME' recargado sin downtime"
else
  warn "Proceso '$APP_NAME' no encontrado en PM2. Arrancando desde el ecosistema..."
  pm2 start ecosystem.config.cjs
  pm2 save
  log "Proceso arrancado"
fi

echo ""
echo -e "${GREEN}✅ Actualización completada${NC}"
echo ""
pm2 status "$APP_NAME"
echo ""
