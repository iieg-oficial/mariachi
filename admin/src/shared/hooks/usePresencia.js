import { useCallback, useEffect, useState } from 'react';
import api from '@shared/services/api';
import { escucharCambios, rutaMenciona } from '@shared/services/cambios';

const LATIDO_MS = 20000;
const ESPERA_AVISO_MS = 250;

const despedirse = (url) => {
    try {
        fetch(`${api.defaults.baseURL}${url}`, {
            method: 'DELETE',
            keepalive: true,
            credentials: 'include',
            headers: { 'X-CSRF-Token': sessionStorage.getItem('csrf_token') || '' },
        });
    } catch { /* la presencia vence sola por TTL */ }
};

export default function usePresencia(basePath, enabled = true, { campo = null, salida = false } = {}) {
    const [editores, setEditores] = useState([]);
    const activo = Boolean(enabled && basePath);
    const url = `${basePath}/presencia`;

    const obtener = useCallback(async () => {
        try {
            const { data } = await api.get(url);
            setEditores(Array.isArray(data) ? data : []);
        } catch { /* silencioso */ }
    }, [url]);

    useEffect(() => {
        if (!activo) return undefined;
        obtener();
        const intervalo = setInterval(obtener, LATIDO_MS);
        let timer = null;
        const quitar = escucharCambios((evento) => {
            const mio = evento.tipo === 'presencia' && rutaMenciona(basePath, evento.id);
            if (!mio && evento.tipo !== 'reconectado') return;
            clearTimeout(timer);
            timer = setTimeout(obtener, ESPERA_AVISO_MS);
        });
        return () => {
            clearInterval(intervalo);
            clearTimeout(timer);
            quitar();
        };
    }, [activo, basePath, obtener]);

    useEffect(() => {
        if (!activo) return undefined;
        const registrar = () => api.put(url, null, { params: campo ? { campo } : {} }).catch(() => {});
        registrar();
        const intervalo = setInterval(registrar, LATIDO_MS);
        return () => clearInterval(intervalo);
    }, [activo, url, campo]);

    useEffect(() => {
        if (!activo || !salida) return undefined;
        const alSalirDeLaPagina = () => despedirse(url);
        window.addEventListener('pagehide', alSalirDeLaPagina);
        return () => {
            window.removeEventListener('pagehide', alSalirDeLaPagina);
            api.delete(url).catch(() => {});
        };
    }, [activo, url, salida]);

    return activo ? editores : [];
}
