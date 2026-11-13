const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

const basename = (ruta) => String(ruta || '').split(/[?#]/)[0].split('/').pop() || '';

export const extensionDe = (ruta) => {
    const nombre = basename(ruta);
    const punto = nombre.lastIndexOf('.');
    return punto > 0 ? nombre.slice(punto + 1).toLowerCase() : '';
};

export const carpetaPorExtension = (archivo) => {
    const ext = extensionDe(archivo?.name ?? archivo);
    return ext ? `metadata/${ext}/` : 'metadata/';
};

export const nombreLegible = (ruta) => {
    const nombre = basename(ruta);
    const sinExtension = nombre.includes('.') ? nombre.slice(0, nombre.lastIndexOf('.')) : nombre;
    if (!sinExtension || UUID.test(sinExtension)) return '';
    const limpio = sinExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : '';
};
