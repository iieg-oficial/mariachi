import { propiedadesDeGrupo } from '@features/mapalab-layers/constants/nodeTypes';

export const POSICION_INICIO = '__inicio__';
export const POSICION_FINAL = '__final__';

const buscar = (nodos, id) => {
    for (const n of nodos || []) {
        if (n.key === id) return n;
        const hallado = buscar(n.children, id);
        if (hallado) return hallado;
    }
    return null;
};

export function nodoPorId(treeData, id) {
    if (!id) return null;
    return buscar(treeData, id);
}

export function hermanosDe(treeData, parentId) {
    if (!parentId) return treeData || [];
    return nodoPorId(treeData, parentId)?.children || [];
}

export function capaDelGrupo(grupo) {
    if (!grupo) return null;
    const conCapa = [grupo, ...propiedadesDeGrupo(grupo)]
        .find((n) => n.workspaceAlias && n.geoserverLayer);
    return conCapa ? { workspaceAlias: conCapa.workspaceAlias, geoserverLayer: conCapa.geoserverLayer } : null;
}

export function ordenConNuevo(hermanosIds, nuevoId, posicion) {
    const resto = (hermanosIds || []).filter((id) => id !== nuevoId);
    if (!posicion || posicion === POSICION_FINAL) return [...resto, nuevoId];
    if (posicion === POSICION_INICIO) return [nuevoId, ...resto];
    const indice = resto.indexOf(posicion);
    if (indice < 0) return [...resto, nuevoId];
    return [...resto.slice(0, indice + 1), nuevoId, ...resto.slice(indice + 1)];
}
