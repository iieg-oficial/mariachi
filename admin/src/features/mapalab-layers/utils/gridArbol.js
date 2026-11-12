import { buildMoveTreeData } from '@features/mapalab-layers/utils/treeSelect';

const PADRES_VALIDOS = new Set(['tema', 'category', 'group']);

const porOrden = (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);

export function nodosDesdeFilas(filas) {
    const hijos = new Map();
    filas.forEach((fila) => {
        const padre = fila.parent_id || null;
        if (!hijos.has(padre)) hijos.set(padre, []);
        hijos.get(padre).push(fila);
    });
    const armar = (padre) => (hijos.get(padre) || []).sort(porOrden).map((fila) => ({
        key: fila.id,
        title: fila.label,
        nodeType: fila.node_type,
        children: armar(fila.id),
    }));
    return armar(null);
}

export function contextoDeUbicacion(filas) {
    const porId = new Map(filas.map((fila) => [fila.id, fila]));
    const pathOf = (id) => {
        const partes = [];
        const vistos = new Set();
        let actual = porId.get(id);
        while (actual && !vistos.has(actual.id)) {
            vistos.add(actual.id);
            partes.unshift(actual.label);
            actual = porId.get(actual.parent_id);
        }
        return partes.length ? partes.join(' › ') : id;
    };
    const conRuta = (nodos) => nodos.map((nodo) => ({
        ...nodo,
        ruta: pathOf(nodo.value),
        children: nodo.children ? conRuta(nodo.children) : undefined,
    }));
    return { treeData: conRuta(buildMoveTreeData(nodosDesdeFilas(filas))), pathOf };
}

export function descendientes(filas, ids) {
    const hijos = new Map();
    filas.forEach((fila) => {
        if (!hijos.has(fila.parent_id)) hijos.set(fila.parent_id, []);
        hijos.get(fila.parent_id).push(fila.id);
    });
    const resultado = new Set();
    const pendientes = [...ids];
    while (pendientes.length) {
        const id = pendientes.pop();
        (hijos.get(id) || []).forEach((hijo) => {
            if (!resultado.has(hijo)) {
                resultado.add(hijo);
                pendientes.push(hijo);
            }
        });
    }
    return resultado;
}

export function planDeMovimiento(filas, seleccion, destino) {
    const destinoFila = filas.find((fila) => fila.id === destino);
    if (!destinoFila || !PADRES_VALIDOS.has(destinoFila.node_type)) {
        return { parches: [], omitidas: seleccion.length, motivo: 'Ese destino no puede contener nodos' };
    }
    const ids = new Set(seleccion.map((fila) => fila.id));
    const porId = new Map(filas.map((fila) => [fila.id, fila]));
    const candidatas = new Set(seleccion.filter((fila) => fila.node_type !== 'tema').map((fila) => fila.id));
    const prohibidos = new Set([...candidatas, ...descendientes(filas, [...candidatas])]);
    if (prohibidos.has(destino)) {
        return { parches: [], omitidas: seleccion.length, motivo: 'No puedes mover nodos dentro de sí mismos' };
    }
    const viajaConAncestro = (fila) => {
        let actual = porId.get(fila.parent_id);
        while (actual) {
            if (candidatas.has(actual.id)) return true;
            actual = porId.get(actual.parent_id);
        }
        return false;
    };
    const movibles = seleccion
        .filter((fila) => candidatas.has(fila.id) && fila.parent_id !== destino)
        .filter((fila) => !viajaConAncestro(fila))
        .sort(porOrden);
    const ordenes = filas
        .filter((fila) => fila.parent_id === destino && !ids.has(fila.id))
        .map((fila) => Number(fila.sort_order) || 0);
    const base = ordenes.length ? Math.max(...ordenes) + 1 : 0;
    const parches = movibles.flatMap((fila, i) => [
        { rowKey: fila.id, column: 'parent_id', value: destino },
        { rowKey: fila.id, column: 'sort_order', value: base + i },
    ]);
    const omitidas = seleccion.filter((fila) => !candidatas.has(fila.id) || fila.parent_id === destino).length;
    return { parches, omitidas, motivo: null };
}
