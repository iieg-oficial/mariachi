/*
 * Quién usa la tarjetita de un grupo.
 *
 * Una propiedad —hoja que cuelga de un grupo— hereda la tarjetita del grupo salvo que tenga
 * una propia. El árbol ya trae eso resuelto: `littleCard` es la efectiva e `inheritedFrom`
 * dice de qué grupo salió. Con esos dos campos se sabe, sin recalcular la regla, quién
 * hereda y quién sobrescribe.
 *
 * La hoja no siempre es hija directa: un grupo puede agrupar sus propiedades bajo etiquetas
 * —«Establecimientos de salud» separa 33 filtros CQL en cuatro niveles de atención—. El
 * backend ya recorre todos los ancestros al propagar, así que aquí se hace lo mismo.
 */

import { propiedadesDeGrupo } from '@features/mapalab-layers/constants/nodeTypes';

const buscarNodo = (nodos, id) => {
    for (const nodo of nodos || []) {
        if (nodo.id === id) return nodo;
        const hallado = buscarNodo(nodo.children, id);
        if (hallado) return hallado;
    }
    return null;
};

const etiqueta = (nodo) => String(nodo.label || nodo.id || '').replace(/^\*/, '');

export const propagacionDelGrupo = (rawTree, groupId) => {
    if (!groupId) return null;
    const grupo = buscarNodo(rawTree, groupId);
    if (!grupo || grupo.nodeType !== 'group') return null;

    const propiedades = propiedadesDeGrupo(grupo);
    const heredan = [];
    const propias = [];
    const sinNada = [];

    propiedades.forEach((n) => {
        const item = { id: n.id, label: etiqueta(n) };
        if (n.inheritedFrom) heredan.push(item);
        else if (n.littleCard) propias.push(item);
        else sinNada.push(item);
    });

    return { total: propiedades.length, heredan, propias, sinNada };
};

export const grupoQueHereda = (rawTree, layerId) => {
    const nodo = buscarNodo(rawTree, layerId);
    if (!nodo?.inheritedFrom) return null;
    const grupo = buscarNodo(rawTree, nodo.inheritedFrom);
    if (!grupo) return null;
    return { id: grupo.id, label: etiqueta(grupo), config: grupo.littleCard || null };
};
