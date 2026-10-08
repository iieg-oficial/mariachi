export const aPruebas = (texto) => String(texto ?? '')
    .split('\n')
    .map((linea) => linea.split('|').map((parte) => parte.trim()))
    .filter(([etiqueta, url]) => etiqueta && url)
    .map(([etiqueta, url]) => ({ etiqueta, url }));

export const deLasPruebas = (pruebas) => (pruebas ?? []).map(({ etiqueta, url }) => `${etiqueta} | ${url}`).join('\n');
