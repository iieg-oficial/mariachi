TARJETITAS_DIR='backups/tarjetitas'

script_env() {
    if [ "$1" = 'dev' ]; then
        export COMPOSE_FILE='compose.yaml:compose.dev.yaml'
        export COMPOSE_ENV_FILE='.env.development'
    else
        export COMPOSE_FILE='compose.yaml:compose.prod.yaml'
        export COMPOSE_ENV_FILE='.env.production'
    fi
}

require_prod_running() {
    if ! project_running "$PROJECT_PROD"; then
        fail 'Entorno:produccion no esta levantada' \
             'Los respaldos solo corren contra produccion: make deploy'
    fi
    row 'Entorno' 'produccion' "$C_GREEN"
}

dataengine_url() {
    local url=${DATAENGINE_URL:-}
    if [ -z "$url" ] && [ -f .env.production ]; then
        url=$(grep -E '^DATAENGINE_DATABASE_URL=' .env.production 2>/dev/null |
            head -1 | sed -E 's/^DATAENGINE_DATABASE_URL=//; s/^["'"'"']//; s/["'"'"']$//')
    fi
    if [ -z "$url" ]; then
        fail 'Tarjetitas:no hay DATAENGINE_DATABASE_URL en .env.production' \
             "Definela ahi, o pasa DATAENGINE_URL='postgres://...' en el entorno."
    fi
    printf '%s' "$url"
}

cron_install() {
    local dir
    dir=$(pwd)
    mkdir -p "$dir/backups"
    {
        crontab -l 2>/dev/null | grep -v 'mariachi-backup' | grep -v 'mariachi-stats' | grep -v 'mariachi-vine' || true
        echo "0 3 * * * cd $dir && make backup-db >> $dir/backups/backup.log 2>&1 # mariachi-backup"
        echo "*/30 * * * * cd $dir && make refresh-mapalab-stats >> $dir/backups/mapalab-stats.log 2>&1 # mariachi-stats-refresh"
        echo "*/10 * * * * cd $dir && make sync-vine >> $dir/backups/vine-sync.log 2>&1 # mariachi-vine-sync"
        echo "30 3 * * * cd $dir && make conciliar-vine >> $dir/backups/vine-conciliar.log 2>&1 # mariachi-vine-conciliar"
    } | crontab -
    row 'Cron' 'instalado' "$C_GREEN" 'respaldo 03:00, stats cada 30 min, vine cada 10 y conciliación 03:30'
    crontab -l | grep -E 'mariachi-(backup|stats|vine)' | while IFS= read -r line; do
        printf '         %s\n' "$line"
    done || true
}

cron_remove() {
    { crontab -l 2>/dev/null | grep -v 'mariachi-backup' | grep -v 'mariachi-stats' | grep -v 'mariachi-vine' || true; } | crontab -
    row 'Cron' 'desinstalado' "$C_GREEN"
}
