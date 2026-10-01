import { aFormData } from '../api/intranetService';

const VACIABLES = ['description', 'background_url', 'enlace', 'boton'];

const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';

const sinCambio = (clave, valor) => clave === 'background_url' && String(valor ?? '').startsWith('/static/');

export const aPayload = (valores, { edicion = false } = {}) => {
    const datos = { ...valores, enlace: valores.enlace?.trim() };
    const vaciar = [];
    VACIABLES.forEach((clave) => {
        if (sinCambio(clave, datos[clave])) {
            datos[clave] = undefined;
        } else if (vacio(datos[clave])) {
            datos[clave] = undefined;
            vaciar.push(clave);
        }
    });
    return aFormData({ ...datos, vaciar: edicion && vaciar.length ? vaciar.join(',') : undefined });
};
