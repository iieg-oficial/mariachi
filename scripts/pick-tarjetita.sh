#!/bin/sh
# Selector interactivo de archivos .sql para restore-tarjetitas.
# Busca primero en restore/ (archivos curados, listos para aplicar) y
# si esta vacia cae a backups/tarjetitas/ (snapshots historicos del backup).
#
# - 0 archivos en ambas: error a stderr pidiendo colocar archivos en restore/.
# - 1 archivo:           se selecciona por default y se imprime a stdout.
# - 2+ archivos:         lista numerada a stderr, lee numero de /dev/tty,
#                        imprime el path elegido a stdout (default = 1).
#
# Variables:
#   RESTORE_DIR       carpeta primaria (default: restore)
#   TARJETITAS_DIR    carpeta fallback (default: backups/tarjetitas)

set -eu

RESTORE_DIR="${RESTORE_DIR:-restore}"
TARJETITAS_DIR="${TARJETITAS_DIR:-backups/tarjetitas}"

SELECTED_DIR=""
FILES=""
for D in "$RESTORE_DIR" "$TARJETITAS_DIR"; do
    if [ -d "$D" ]; then
        CANDIDATES=$(ls -1t "$D"/*.sql 2>/dev/null || true)
        if [ -n "$CANDIDATES" ]; then
            SELECTED_DIR="$D"
            FILES="$CANDIDATES"
            break
        fi
    fi
done

if [ -z "$FILES" ]; then
    echo "No hay exports .sql en $RESTORE_DIR/ ni en $TARJETITAS_DIR/." >&2
    echo "Coloca el archivo a aplicar en $RESTORE_DIR/, o corre 'make backup-tarjetitas' para generar uno." >&2
    exit 1
fi

COUNT=$(printf '%s\n' "$FILES" | wc -l | tr -d ' ')

if [ "$COUNT" -eq 1 ]; then
    echo "[restore-tarjetitas] Solo un export disponible en $SELECTED_DIR/, seleccionando por default:" >&2
    echo "  $FILES" >&2
    printf '%s' "$FILES"
    exit 0
fi

echo "Exports en $SELECTED_DIR/ (mas reciente primero):" >&2
i=1
printf '%s\n' "$FILES" | while IFS= read -r f; do
    printf "  %d) %s\n" "$i" "$f" >&2
    i=$((i + 1))
done

if (: </dev/tty) 2>/dev/null; then
    printf "Numero a aplicar [1]: " >/dev/tty
    read -r CHOICE </dev/tty
else
    printf "Numero a aplicar [1]: " >&2
    read -r CHOICE
fi
CHOICE=${CHOICE:-1}

case "$CHOICE" in
    ''|*[!0-9]*)
        echo "Seleccion invalida: '$CHOICE'." >&2
        exit 1
        ;;
esac

if [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "$COUNT" ]; then
    echo "Seleccion fuera de rango: $CHOICE (hay $COUNT opciones)." >&2
    exit 1
fi

SELECTED=$(printf '%s\n' "$FILES" | sed -n "${CHOICE}p")
echo "[restore-tarjetitas] Seleccionado: $SELECTED" >&2
printf '%s' "$SELECTED"
