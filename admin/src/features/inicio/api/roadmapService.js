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

export const aCiclo = (fila) => ({
    id: fila.clave,
    nombre: fila.nombre,
    nota: fila.nota,
    motivo: fila.motivo,
    color: fila.color,
    x0: fila.x0,
    x1: fila.x1,
    y0: fila.y0 ?? undefined,
    y1: fila.y1 ?? undefined,
    orden: fila.orden,
});

const aFilaCiclo = (ciclo) => ({
    nombre: ciclo.nombre,
    nota: ciclo.nota || '',
    motivo: ciclo.motivo || '',
    color: ciclo.color,
    x0: Number(ciclo.x0),
    x1: Number(ciclo.x1),
    y0: ciclo.y0 ?? null,
    y1: ciclo.y1 ?? null,
    orden: ciclo.orden ?? 0,
});

export const aProceso = (fila) => ({
    id: fila.clave,
    txt: fila.etiqueta,
    proy: fila.proyecto,
    desde: fila.desde,
    cada: fila.cada,
    fecha: fila.fecha_texto,
    motivo: fila.motivo,
    orden: fila.orden,
});

const aFilaProceso = (proceso) => ({
    etiqueta: proceso.txt,
    proyecto: proceso.proy,
    desde: proceso.desde,
    cada: proceso.cada,
    fecha_texto: proceso.fecha,
    motivo: proceso.motivo,
    activo: true,
    orden: proceso.orden ?? 0,
});

export const getCiclos = async () => (await api.get('/roadmap/ciclos')).data.map(aCiclo);
export const getProcesos = async () => (await api.get('/roadmap/procesos')).data.map(aProceso);

export const crearCiclo = async (c) => aCiclo((await api.post('/roadmap/ciclos', { clave: c.id, ...aFilaCiclo(c) })).data);
export const actualizarCiclo = async (c) => aCiclo((await api.put(`/roadmap/ciclos/${c.id}`, aFilaCiclo(c))).data);
export const eliminarCiclo = async (clave) => { await api.delete(`/roadmap/ciclos/${clave}`); };

export const crearProceso = async (p) => aProceso((await api.post('/roadmap/procesos', { clave: p.id, ...aFilaProceso(p) })).data);
export const actualizarProceso = async (p) => aProceso((await api.put(`/roadmap/procesos/${p.id}`, aFilaProceso(p))).data);
export const eliminarProceso = async (clave) => { await api.delete(`/roadmap/procesos/${clave}`); };
