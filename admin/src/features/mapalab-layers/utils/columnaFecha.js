const opcion = (f) => ({ value: f.name, label: `${f.name} (${f.type})` });

export const opcionesColumnaFecha = (fields, actual) => {
    const conNombre = (fields || []).filter((f) => f.name && f.type !== 'geometry');
    const fechas = conNombre.filter((f) => f.type === 'date').map(opcion);
    const otras = conNombre.filter((f) => f.type !== 'date').map(opcion);
    const grupos = [];
    if (actual && !conNombre.some((f) => f.name === actual)) {
        grupos.push({ label: 'Guardada', options: [{ value: actual, label: `${actual} (no existe en la capa)` }] });
    }
    if (fechas.length) grupos.push({ label: 'Fechas', options: fechas });
    if (otras.length) grupos.push({ label: 'Otras columnas', options: otras });
    return grupos;
};

export const CONTRACT_DATE_COLUMN = 'fecha_periodo_seleccion';

export const candidatasPorContrato = (rows) => rows.filter(
    (row) => row.fecha_contrato && !String(row.date_column || '').trim(),
);
