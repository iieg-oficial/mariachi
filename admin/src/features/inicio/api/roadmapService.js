import api from '@shared/services/api';

export const aHito = (fila) => ({
    id: fila.clave,
    txt: fila.etiqueta,
    proy: fila.proyecto,
    tipo: fila.tipo,
    f: fila.fecha_eje,
    fecha: fila.fecha_texto,
    motivo: fila.motivo,
    antes: fila.nombre_anterior || undefined,
    de: fila.feature_de || undefined,
    naceDe: fila.nace_de || undefined,
    leyenda: fila.leyenda || undefined,
    beta: fila.beta,
    muerto: fila.muerto,
    orden: fila.orden,
});

const aFila = (hito) => ({
    etiqueta: hito.txt,
    proyecto: hito.proy,
    tipo: hito.tipo,
    fecha_eje: hito.f,
    fecha_texto: hito.fecha,
    motivo: hito.motivo,
    nombre_anterior: hito.antes || null,
    feature_de: hito.de || null,
    nace_de: hito.naceDe || null,
    leyenda: hito.leyenda || null,
    beta: Boolean(hito.beta),
    muerto: Boolean(hito.muerto),
    orden: hito.orden ?? 0,
});

export const getHitos = async () => {
    const res = await api.get('/roadmap/hitos');
    return res.data.map(aHito);
};

export const crearHito = async (hito) => {
    const res = await api.post('/roadmap/hitos', { clave: hito.id, ...aFila(hito) });
    return aHito(res.data);
};

export const actualizarHito = async (hito) => {
    const res = await api.put(`/roadmap/hitos/${hito.id}`, aFila(hito));
    return aHito(res.data);
};

export const eliminarHito = async (clave) => {
    await api.delete(`/roadmap/hitos/${clave}`);
};
