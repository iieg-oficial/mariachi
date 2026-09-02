import { useCallback, useEffect, useMemo, useState } from 'react';
import { App } from 'antd';
import * as servicio from '@features/inicio/api/roadmapService';

const NUEVOS = {
    hitos: () => ({
        txt: 'hito nuevo', proy: 'infra', tipo: 'mayor',
        f: new Date().toISOString().slice(0, 10), fecha: 'sin fecha',
        motivo: 'Sin describir todavía.',
    }),
    ciclos: () => ({
        nombre: 'ciclo nuevo', nota: '', motivo: 'Sin describir todavía.',
        color: '#5C2472', x0: 400, x1: 800,
    }),
    procesos: () => ({
        txt: 'proceso nuevo', proy: 'infra',
        desde: new Date().toISOString().slice(0, 10), cada: '01-15',
        fecha: 'anual', motivo: 'Sin describir todavía.',
    }),
};

const API = {
    hitos: { leer: servicio.getHitos, crear: servicio.crearHito, actualizar: servicio.actualizarHito, borrar: servicio.eliminarHito },
    ciclos: { leer: servicio.getCiclos, crear: servicio.crearCiclo, actualizar: servicio.actualizarCiclo, borrar: servicio.eliminarCiclo },
    procesos: { leer: servicio.getProcesos, crear: servicio.crearProceso, actualizar: servicio.actualizarProceso, borrar: servicio.eliminarProceso },
};

export default function useRoadmapHitos() {
    const { message } = App.useApp();
    const [datos, setDatos] = useState([]);
    const [ciclos, setCiclos] = useState([]);
    const [procesos, setProcesos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const contenedores = useMemo(
        () => ({ hitos: setDatos, ciclos: setCiclos, procesos: setProcesos }),
        [],
    );

    useEffect(() => {
        let cancelado = false;
        Promise.all([servicio.getHitos(), servicio.getCiclos(), servicio.getProcesos()])
            .then(([h, c, pr]) => {
                if (cancelado) return;
                setDatos(h);
                setCiclos(c);
                setProcesos(pr);
            })
            .catch(() => {})
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, []);

    const guardar = useCallback(async (tipo, item) => {
        setGuardando(true);
        try {
            const guardado = await API[tipo].actualizar(item);
            contenedores[tipo]((previos) => previos.map((x) => (x.id === guardado.id ? guardado : x)));
            message.success('Cambio guardado');
        } catch {
            message.error('No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    }, [message, contenedores]);

    const agregar = useCallback(async (tipo, extra) => {
        setGuardando(true);
        try {
            const creado = await API[tipo].crear({
                id: `${tipo}-${Date.now()}`, ...NUEVOS[tipo](), ...(extra || {}),
            });
            contenedores[tipo]((previos) => [...previos, creado]);
            message.success('Elemento creado');
            return creado.id;
        } catch {
            message.error('No se pudo crear');
            return null;
        } finally {
            setGuardando(false);
        }
    }, [message, contenedores]);

    const eliminar = useCallback(async (tipo, clave) => {
        try {
            await API[tipo].borrar(clave);
            contenedores[tipo]((previos) => previos.filter((x) => x.id !== clave));
            message.success('Elemento eliminado');
        } catch {
            message.error('No se pudo eliminar');
        }
    }, [message, contenedores]);

    return { datos, ciclos, procesos, cargando, guardando, guardar, agregar, eliminar };
}
