export const TIPOS_ESPACIO = {
    oficina: { texto: 'Oficina', color: 'purple' },
    trabajo: { texto: 'Área de trabajo', color: 'orange' },
    sala: { texto: 'Sala', color: 'blue' },
    recepcion: { texto: 'Recepción y espera', color: 'green' },
    comedor: { texto: 'Comedor', color: 'gold' },
    circulacion: { texto: 'Pasillo o andador', color: 'default' },
    exterior: { texto: 'Exterior', color: 'lime' },
    servicio: { texto: 'Servicio', color: 'default' },
};

export const OPCIONES_TIPO = Object.entries(TIPOS_ESPACIO).map(([value, { texto }]) => ({ value, label: texto }));

export const ORIGENES = { mariachi: 'mariachi', qgis: 'QGIS', carga: 'carga inicial', sql: 'base de datos' };

export const CAMPOS_HISTORIAL = {
    nombre: 'Nombre',
    tipo: 'Tipo',
    piso_id: 'Piso',
    incluir: 'Se puede elegir',
    aproximado: 'Trazo aproximado',
    orden: 'Orden',
};
