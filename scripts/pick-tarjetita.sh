#!/bin/sh
# Selector interactivo de archivos .sql en backups/tarjetitas/.
# - 0 archivos: error a stderr, exit 1.
# - 1 archivo:  se selecciona por default y se imprime a stdout.
# - 2+ archivos: lista numerada a stderr, lee numero de /dev/tty,
#                imprime el path elegido a stdout (default = 1).
#
# Variables:
#   TARJETITAS_DIR    carpeta a listar (default: backups/tarjetitas)

set -eu

DIR="${TARJETITAS_DIR:-backups/tarjetitas}"

if [ ! -d "$DIR" ]; then
    echo "No existe $DIR/. Corre primero 'make backup-tarjetitas'." >&2
    exit 1
fi

FILES=$(ls -1t "$DIR"/*.sql 2>/dev/null || true)
if [ -z "$FILES" ]; then
    echo "No hay exports .sql en $DIR/. Corre primero 'make backup-tarjetitas'." >&2
    exit 1
fi

COUNT=$(printf '%s\n' "$FILES" | wc -l | tr -d ' ')

if [ "$COUNT" -eq 1 ]; then
    echo "[restore-tarjetitas] Solo un export disponible, seleccionando por default:" >&2
    echo "  $FILES" >&2
    printf '%s' "$FILES"
    exit 0
fi

echo "Exports en $DIR/ (mas reciente primero):" >&2
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
