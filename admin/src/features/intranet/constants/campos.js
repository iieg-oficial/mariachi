export const IMAGENES = 'image/jpeg,image/png,image/gif,image/webp';
export const DOCUMENTOS = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';

export const ICONOS_ENLACE = [
    'link', 'globe', 'shield', 'document', 'server', 'book', 'monitor', 'phone', 'mail', 'location',
].map((valor) => ({ value: valor, label: valor }));

export const ESTADOS_CARRUSEL = {
    pendiente: { color: 'warning', texto: 'Pendiente' },
    aprobado: { color: 'success', texto: 'Publicado' },
    rechazado: { color: 'error', texto: 'Rechazado' },
};

export const AYUDA_PUBLICO = 'La intranet se ve sin iniciar sesión: no subas nada que no pueda ver '
    + 'cualquier persona del instituto.';
