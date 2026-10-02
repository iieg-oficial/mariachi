export const PERMISO_VER = 'mariachi.sieej_documentacion.view';
export const PERMISO_EDITAR = 'mariachi.sieej_documentacion.update';
export const PERMISO_PUBLICAR = 'mariachi.sieej_documentacion.publish';

export const TIPOS = {
    descripcion: { etiqueta: 'Descripción', color: 'blue', medida: false },
    fuente: { etiqueta: 'Fuente de datos', color: 'blue', medida: false },
    tablas: { etiqueta: 'Tablas', color: 'purple', medida: true },
    vistas: { etiqueta: 'Vistas', color: 'purple', medida: true },
    ejecucion: { etiqueta: 'Ejecución en Airflow', color: 'purple', medida: true },
    variables: { etiqueta: 'Variables de entorno', color: 'blue', medida: false },
    diagrama: { etiqueta: 'Diagrama entidad-relación', color: 'purple', medida: true },
    texto: { etiqueta: 'Texto libre', color: 'green', medida: false },
};

export const CONTENIDO_VACIO = {
    descripcion: { parrafos: [], avisos: [] },
    fuente: { caracteristicas: [], fuente_general: null, descargas: [] },
    tablas: { notas: {} },
    vistas: { notas: {} },
    ejecucion: { nota: null },
    variables: { variables: [] },
    diagrama: { origen: 'auto' },
    texto: { markdown: '' },
};

export const ESTADOS = {
    nuevo: { etiqueta: 'Nuevo', color: 'processing' },
    activo: { etiqueta: 'Publicado', color: 'success' },
    retirado: { etiqueta: 'Retirado', color: 'error' },
};

export const ESTADOS_SYNC = {
    ok: { etiqueta: 'Correcta', color: 'success' },
    parcial: { etiqueta: 'Parcial', color: 'warning' },
    error: { etiqueta: 'Con error', color: 'error' },
};

export const errorDetalle = (err, respaldo) => err?.response?.data?.detail || respaldo;
