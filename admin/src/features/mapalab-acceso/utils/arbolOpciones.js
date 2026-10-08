export const opcionesDeArbol = (nodos) => (nodos || []).map((n) => ({
    value: n.id,
    title: n.label || n.id,
    privada: n.privada === true,
    children: n.children?.length ? opcionesDeArbol(n.children) : undefined,
}));

export const nombresPorId = (nodos, salida = {}) => {
    (nodos || []).forEach((n) => {
        salida[n.id] = n.label || n.id;
        if (n.children?.length) nombresPorId(n.children, salida);
    });
    return salida;
};

export const textoDeConteo = (n, singular, plural) => (n === 1 ? `1 ${singular}` : `${n} ${plural}`);
