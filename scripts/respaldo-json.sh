#!/usr/bin/env bash

COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
COMPOSE_CMD="docker compose"
if [ -n "$COMPOSE_ENV_FILE" ]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $COMPOSE_ENV_FILE"
fi

psql_base() {
    $COMPOSE_CMD exec -T postgres sh -c \
        'PGPASSWORD="$(cat /run/secrets/postgres_password)" psql -v ON_ERROR_STOP=1 -qAt \
            -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

contar_filas() {
    python3 -c 'import json, sys; print(sum(len(v) for v in json.load(sys.stdin).values()))'
}

SQL_DIR="$(dirname "${BASH_SOURCE[0]}")/sql"

volcar_respaldo() {
    local sql=$1 parcial=$2
    umask 077
    mkdir -p "$(dirname "$parcial")"
    psql_base < "$SQL_DIR/$sql" | gzip -9 > "$parcial"
    gzip -t "$parcial"
}

publicar_respaldo() {
    local nombre=$1 parcial=$2 dir=$3 retener=$4 destino sobrantes
    destino="${parcial%.parcial}"
    mv "$parcial" "$destino"
    printf '[%s-backup] archivo %s (%s)\n' "$nombre" "$destino" "$(du -h "$destino" | cut -f1)"
    sobrantes=$(ls -1t "$dir/$nombre"-*.json.gz 2>/dev/null | tail -n "+$((retener + 1))" || true)
    if [ -n "$sobrantes" ]; then
        echo "$sobrantes" | xargs rm -f
    fi
}

sql_con_datos() {
    local archivo=$1 sql=$2 etiqueta
    etiqueta="datos_$(od -An -N6 -tx1 /dev/urandom | tr -d ' \n')"
    printf 'BEGIN;\nCREATE TEMP TABLE _carga (datos jsonb) ON COMMIT DROP;\nINSERT INTO _carga VALUES ($%s$' "$etiqueta"
    gzip -dc "$archivo"
    printf '$%s$);\n' "$etiqueta"
    cat "$SQL_DIR/respaldo-comun.sql" "$SQL_DIR/$sql"
    printf 'COMMIT;\n'
}

confirmar_restore() {
    local palabra=$1 descripcion=$2 respuesta
    printf '  Se FUSIONAN %s\n' "$descripcion"
    printf '  Escribe "%s" para confirmar: ' "$palabra"
    read -r respuesta
    [ "$respuesta" = "$palabra" ] || { echo '  Cancelado.'; exit 1; }
}
