const normalizar = (ruta) => `${(ruta || '').replace(/^\/+|\/+$/g, '')}/`;

export const puedeEn = (bucket, accion) => Boolean(bucket?.acciones?.includes(accion));

export const carpetasEscribibles = (bucket) => bucket?.carpetas_escribibles || [];

export const puedeSubir = (bucket) => puedeEn(bucket, 'create') || carpetasEscribibles(bucket).length > 0;

export const puedeSubirEn = (bucket, carpeta) => {
    if (puedeEn(bucket, 'create')) return true;
    const ruta = normalizar(carpeta);
    return ruta !== '/' && !ruta.split('/').includes('..')
        && carpetasEscribibles(bucket).some((prefijo) => ruta.startsWith(prefijo));
};
