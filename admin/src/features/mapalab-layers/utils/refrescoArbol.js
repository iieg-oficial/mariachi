/*
 * Refrescar el árbol después de guardar.
 *
 * Al guardar, mariachi avisa a mapalab con `notify_tree_changed`, que **agrupa los avisos en una
 * ventana de 5 s** antes de invalidar el caché del árbol. Recargar solo de inmediato trae el árbol
 * viejo, y por eso el contador de propagación se quedaba igual hasta que refrescabas a mano.
 *
 * Se recarga dos veces: una al instante —por si el caché ya estaba fresco— y otra pasada la
 * ventana. Con `alVuelo` la promesa devuelta se resuelve tras la primera, para no dejar el botón
 * de guardar girando cinco segundos; la segunda sigue corriendo por su cuenta.
 */

export const VENTANA_NOTIFICADOR_MS = 5500;

const esperar = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

export const refrescarArbol = (reload, { alVuelo = true } = {}) => {
    if (typeof reload !== 'function') return Promise.resolve();
    const primera = reload();
    const segunda = primera
        .then(() => esperar(VENTANA_NOTIFICADOR_MS))
        .then(() => reload());
    if (!alVuelo) return segunda;
    segunda.catch(() => {});
    return primera;
};
