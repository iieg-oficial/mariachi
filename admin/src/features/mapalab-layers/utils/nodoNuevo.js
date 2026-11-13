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

export function ordenConNuevos(hermanosIds, nuevosIds, posicion) {
    const resto = (hermanosIds || []).filter((id) => !nuevosIds.includes(id));
    if (!posicion || posicion === POSICION_FINAL) return [...resto, ...nuevosIds];
    if (posicion === POSICION_INICIO) return [...nuevosIds, ...resto];
    const indice = resto.indexOf(posicion);
    if (indice < 0) return [...resto, ...nuevosIds];
    return [...resto.slice(0, indice + 1), ...nuevosIds, ...resto.slice(indice + 1)];
}

export function slugify(text) {
    if (!text) return '';
    return text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

function nombreDesdeCapa(ref) {
    const limpio = ((ref || '').split('::')[1] || '').replace(/[_-]+/g, ' ').trim();
    return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : '';
}

let consecutivo = 0;

export function filaNueva(gsRef = null) {
    consecutivo += 1;
    const label = nombreDesdeCapa(gsRef);
    const id = slugify(label);
    return { uid: `fila-${consecutivo}`, label, gsRef, geometria: null, id, slug: id, idManual: false, slugManual: false };
}

export function aplicarCambios(fila, cambios) {
    const siguiente = { ...fila, ...cambios };
    if ('id' in cambios) siguiente.idManual = Boolean(cambios.id);
    if ('slug' in cambios) siguiente.slugManual = Boolean(cambios.slug);
    if ('label' in cambios) {
        const auto = slugify(cambios.label);
        if (!siguiente.idManual) siguiente.id = auto;
        if (!siguiente.slugManual) siguiente.slug = auto;
    }
    return siguiente;
}

export function filasConCapas(filas, refs) {
    const vacia = (f) => !f.gsRef && !f.label.trim();
    const conservadas = filas.filter((f) => (f.gsRef ? refs.includes(f.gsRef) : !vacia(f)));
    const nuevas = refs.filter((r) => !filas.some((f) => f.gsRef === r)).map((r) => filaNueva(r));
    const resultado = [...conservadas, ...nuevas];
    return resultado.length ? resultado : [filaNueva()];
}

const ID_VALIDO = /^[a-z0-9-]+$/;
const SLUG_VALIDO = /^[a-z0-9-]*$/;

export function erroresDeFilas(filas, conSlug) {
    const errores = {};
    const conteo = filas.reduce((acc, f) => ({ ...acc, [f.id]: (acc[f.id] || 0) + 1 }), {});
    filas.forEach((f) => {
        if (!f.label.trim()) errores[f.uid] = 'Falta el nombre';
        else if (f.label.length > 255) errores[f.uid] = 'El nombre pasa de 255 caracteres';
        else if (!f.id || !ID_VALIDO.test(f.id) || f.id.length > 100) errores[f.uid] = 'El ID solo lleva minúsculas, números y guiones';
        else if (conteo[f.id] > 1) errores[f.uid] = 'El ID se repite en este lote';
        else if (conSlug && (!SLUG_VALIDO.test(f.slug || '') || (f.slug || '').length > 60)) errores[f.uid] = 'La URL solo lleva minúsculas, números y guiones';
    });
    return errores;
}
