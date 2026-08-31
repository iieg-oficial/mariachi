import { useCallback, useEffect, useState } from 'react';
import { App } from 'antd';
import {
    actualizarHito,
    crearHito,
    eliminarHito,
    getHitos,
} from '@features/inicio/api/roadmapService';

export default function useRoadmapHitos() {
    const { message } = App.useApp();
    const [datos, setDatos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let cancelado = false;
        getHitos()
            .then((filas) => { if (!cancelado) setDatos(filas); })
            .catch(() => { if (!cancelado) setDatos([]); })
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, []);

    const guardar = useCallback(async (hito) => {
        setGuardando(true);
        try {
            const guardado = await actualizarHito(hito);
            setDatos((previos) => previos.map((h) => (h.id === guardado.id ? guardado : h)));
            message.success('Hito actualizado');
        } catch {
            message.error('No se pudo guardar el hito');
        } finally {
            setGuardando(false);
        }
    }, [message]);

    const agregar = useCallback(async () => {
        setGuardando(true);
        try {
            const creado = await crearHito({
                id: `hito-${Date.now()}`,
                txt: 'hito nuevo',
                proy: 'infra',
                tipo: 'mayor',
                f: new Date().toISOString().slice(0, 10),
                fecha: 'sin fecha',
                motivo: 'Sin describir todavía.',
            });
            setDatos((previos) => [...previos, creado]);
            message.success('Hito creado');
            return creado.id;
        } catch {
            message.error('No se pudo crear el hito');
            return null;
        } finally {
            setGuardando(false);
        }
    }, [message]);

    const eliminar = useCallback(async (clave) => {
        try {
            await eliminarHito(clave);
            setDatos((previos) => previos.filter((h) => h.id !== clave));
            message.success('Hito eliminado');
        } catch {
            message.error('No se pudo eliminar el hito');
        }
    }, [message]);

    return { datos, cargando, guardando, guardar, agregar, eliminar };
}
