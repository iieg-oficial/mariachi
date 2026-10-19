import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@shared/services/api';
import { message } from '@shared/services/message';

export const rolesDirectos = (persona) => (persona?.roles || [])
    .filter((r) => r.via === 'direct')
    .map((r) => r.id);

export default function useAccesoMinerva(activo) {
    const [roles, setRoles] = useState([]);
    const [personas, setPersonas] = useState([]);
    const [cargando, setCargando] = useState(false);

    const recargar = useCallback(async () => {
        if (!activo) return;
        setCargando(true);
        try {
            const [rolesRes, personasRes] = await Promise.all([
                api.get('/usuarios/acceso/roles'),
                api.get('/usuarios/acceso/personas'),
            ]);
            setRoles(rolesRes.data);
            setPersonas(personasRes.data);
        } catch {
            message.warning('No se pudo consultar el acceso en minerva');
        } finally {
            setCargando(false);
        }
    }, [activo]);

    useEffect(() => { recargar(); }, [recargar]);

    const porUsuario = useMemo(
        () => new Map(personas.filter((p) => p.usuario_id).map((p) => [p.usuario_id, p])),
        [personas],
    );

    const guardar = useCallback(async (usuarioId, roleIds) => {
        const { data } = await api.put(`/usuarios/${usuarioId}/acceso`, { roleIds });
        return data.enlace;
    }, []);

    const sincronizar = useCallback(async (usuarioId, roleIds = []) => {
        const actuales = rolesDirectos(porUsuario.get(usuarioId));
        const iguales = actuales.length === roleIds.length && actuales.every((id) => roleIds.includes(id));
        if (iguales) return null;
        const enlace = await guardar(usuarioId, roleIds);
        await recargar();
        return enlace;
    }, [guardar, porUsuario, recargar]);

    const enviar = useCallback(async (usuarioId) => {
        const { data } = await api.post(`/usuarios/${usuarioId}/acceso/enlace`);
        return data;
    }, []);

    const personaDe = useCallback((usuarioId) => porUsuario.get(usuarioId) || null, [porUsuario]);
    const delegables = useMemo(() => roles.filter((r) => r.delegable), [roles]);

    return useMemo(() => ({
        roles: delegables,
        personaDe,
        cargando,
        sincronizar,
        enviar,
    }), [cargando, delegables, enviar, personaDe, sincronizar]);
}
