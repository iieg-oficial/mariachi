export function aliasSugerido(geoserverWorkspace) {
    if (!geoserverWorkspace) return '';
    return geoserverWorkspace.split('_')[0].toLowerCase();
}

export function aliasTomado(alias, registrados) {
    if (!alias) return null;
    return (registrados || []).find((ws) => ws.alias === alias) || null;
}
