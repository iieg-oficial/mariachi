import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@shared/services/api';

export function useCapasGeoServer({ activo, isAdmin }) {
    const [workspaces, setWorkspaces] = useState([]);
    const [pendientes, setPendientes] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        if (!activo) return undefined;
        let cancelado = false;
        setCargando(true);
        api.get('/geoserver/workspaces', { params: { with_usage: true } })
            .then((res) => { if (!cancelado) setWorkspaces(res.data || []); })
            .catch(() => { if (!cancelado) setWorkspaces([]); })
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, [activo, recarga]);

    useEffect(() => {
        if (!activo || !isAdmin) return undefined;
        let cancelado = false;
        api.get('/geoserver/workspaces/pending')
            .then((res) => { if (!cancelado) setPendientes(res.data || []); })
            .catch(() => { if (!cancelado) setPendientes([]); });
        return () => { cancelado = true; };
    }, [activo, isAdmin, recarga]);

    const opciones = useMemo(() => (
        workspaces
            .filter((ws) => (ws.layers || []).length > 0)
            .map((ws) => ({
                label: ws.label ? `${ws.alias} — ${ws.label}` : ws.alias,
                title: ws.alias,
                options: ws.layers.map((name) => ({
                    value: `${ws.alias}::${name}`,
                    label: name,
                    uso: ws.layerUsage?.[name] || 0,
                })),
            }))
    ), [workspaces]);

    const recargar = useCallback(() => setRecarga((k) => k + 1), []);

    return { opciones, pendientes, cargando, recargar };
}
