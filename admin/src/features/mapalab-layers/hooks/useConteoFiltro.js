import { useEffect, useState } from 'react';
import api from '@shared/services/api';

const ESPERA_MS = 500;

export function useConteoFiltro(alias, capa, cql) {
    const [estado, setEstado] = useState({ total: null, error: null, cargando: false });

    useEffect(() => {
        if (!alias || !capa) {
            setEstado({ total: null, error: null, cargando: false });
            return undefined;
        }
        let cancelado = false;
        setEstado((prev) => ({ ...prev, cargando: true }));
        const temporizador = setTimeout(() => {
            api.get(`/geoserver/workspaces/${encodeURIComponent(alias)}/layers/${encodeURIComponent(capa)}/count`, {
                params: cql && cql.trim() ? { cql: cql.trim() } : {},
            })
                .then((res) => { if (!cancelado) setEstado({ total: res.data?.count ?? null, error: null, cargando: false }); })
                .catch((err) => {
                    if (cancelado) return;
                    setEstado({ total: null, error: err?.response?.data?.detail || 'No se pudo contar', cargando: false });
                });
        }, ESPERA_MS);
        return () => { cancelado = true; clearTimeout(temporizador); };
    }, [alias, capa, cql]);

    return estado;
}
