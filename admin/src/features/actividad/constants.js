export const ROLE_TAG = {
    tetlamamakani: { color: 'red', label: 'Administradora' },
    editora: { color: 'blue', label: 'Editora' },
    externo: { color: 'green', label: 'Externo' },
};

export const ACTION_PREFIXES = [
    { value: 'user.', label: 'Usuarios (user.*)' },
    { value: 'sieej.', label: 'SIEEJ (sieej.*)' },
    { value: 'login.', label: 'Login (login.*)' },
    { value: 'reporte.', label: 'Reportes (reporte.*)' },
    { value: 'colibri.', label: 'Colibrí (colibri.*)' },
    { value: 'evento.', label: 'Eventos (evento.*)' },
    { value: 'home.', label: 'Home (home.*)' },
    { value: 'acervo.', label: 'Acervo (acervo.*)' },
];

export const ACTION_LABELS = {
    'login.success': { text: 'Inicio de sesión', color: 'green' },
    'login.failed': { text: 'Inicio de sesión fallido', color: 'red' },
    'login.logout': { text: 'Cierre de sesión', color: 'default' },
    'user.create': { text: 'Usuario creado', color: 'green' },
    'user.update': { text: 'Usuario actualizado', color: 'blue' },
    'user.delete': { text: 'Usuario eliminado', color: 'red' },
    'user.reset_password': { text: 'Contraseña restablecida', color: 'orange' },
    'reporte.update': { text: 'Reporte actualizado', color: 'blue' },
    'reporte.delete': { text: 'Reporte eliminado', color: 'red' },
    'sieej.formulario.create': { text: 'Formulario SIEEJ creado', color: 'green' },
    'sieej.formulario.update': { text: 'Formulario SIEEJ actualizado', color: 'blue' },
    'sieej.envio.reabrir': { text: 'Envío SIEEJ reabierto', color: 'orange' },
    'colibri.direccion.create': { text: 'Dirección creada', color: 'green' },
    'colibri.direccion.update': { text: 'Dirección actualizada', color: 'blue' },
    'colibri.direccion.delete': { text: 'Dirección eliminada', color: 'red' },
    'colibri.route.create': { text: 'Ruta creada', color: 'green' },
    'colibri.route.update': { text: 'Ruta actualizada', color: 'blue' },
    'colibri.route.delete': { text: 'Ruta eliminada', color: 'red' },
    'colibri.source_app.create': { text: 'App origen creada', color: 'green' },
    'colibri.source_app.update': { text: 'App origen actualizada', color: 'blue' },
    'colibri.source_app.delete': { text: 'App origen eliminada', color: 'red' },
    'colibri.source_app.rotate_key': { text: 'Llave de app rotada', color: 'orange' },
    'colibri.tipo.create': { text: 'Tipo creado', color: 'green' },
    'colibri.tipo.update': { text: 'Tipo actualizado', color: 'blue' },
    'colibri.tipo.delete': { text: 'Tipo eliminado', color: 'red' },
    'evento.create': { text: 'Evento creado', color: 'green' },
    'evento.update': { text: 'Evento actualizado', color: 'blue' },
    'evento.delete': { text: 'Evento eliminado', color: 'red' },
    'evento.publicar': { text: 'Evento publicado', color: 'green' },
    'evento.despublicar': { text: 'Evento despublicado', color: 'orange' },
    'home.update_draft': { text: 'Borrador de home actualizado', color: 'blue' },
    'home.publicar': { text: 'Home publicado', color: 'green' },
    'home.descartar_borrador': { text: 'Borrador de home descartado', color: 'orange' },
    'acervo.file.upload': { text: 'Archivo subido al Acervo', color: 'green' },
    'acervo.file.move': { text: 'Archivo movido de carpeta', color: 'blue' },
    'acervo.file.delete': { text: 'Archivo eliminado del Acervo', color: 'red' },
    'acervo.folder.create': { text: 'Carpeta creada en el Acervo', color: 'green' },
    'acervo.folder.delete': { text: 'Carpeta eliminada del Acervo', color: 'red' },
};

export const RESOURCE_LABELS = {
    usuario: 'Usuario',
    reporte: 'Reporte',
    evento: 'Evento',
    home_section: 'Sección de home',
    'sieej.formulario': 'Formulario SIEEJ',
    'sieej.envio': 'Envío SIEEJ',
    'colibri.direccion': 'Dirección',
    'colibri.route': 'Ruta',
    'colibri.source_app': 'App origen',
    'colibri.tipo': 'Tipo',
    'acervo.file': 'Archivo de Acervo',
    'acervo.folder': 'Carpeta de Acervo',
};

export const META_KEY_LABELS = {
    username: 'Usuario',
    role: 'Rol',
    name: 'Nombre',
    slug: 'Slug',
    estado_from: 'Estado anterior',
    estado_to: 'Estado nuevo',
    formulario_id: 'Formulario',
    version_from: 'Versión anterior',
    version_to: 'Versión nueva',
    definicion_changed: 'Definición modificada',
    campos: 'Campos modificados',
    fields: 'Campos modificados',
    nombre: 'Nombre',
    bucket: 'Bucket',
    carpeta: 'Carpeta',
    de: 'De',
    a: 'A',
    objetos: 'Objetos eliminados',
};

export const formatActividadDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX');
};

export const formatMetaValue = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};
