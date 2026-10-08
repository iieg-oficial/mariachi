import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';

import { actualizar, crear, eliminar, listar } from '../api/intranetService';

const detalleDe = (error, respaldo) => {
    const detalle = error?.response?.data?.detail;
    if (typeof detalle === 'string') return detalle;
    if (Array.isArray(detalle) && detalle[0]?.msg) return detalle[0].msg;
    return respaldo;
};

export const useRecurso = (recurso, { singular }) => {
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setFilas(await listar(recurso));
        } catch (error) {
            message.error(detalleDe(error, 'No se pudo consultar la intranet'));
        } finally {
            setCargando(false);
        }
    }, [recurso]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const guardar = async (payload, id) => {
        setGuardando(true);
        try {
            if (id) await actualizar(recurso, id, payload);
            else await crear(recurso, payload);
            message.success(`${singular} ${id ? 'actualizado' : 'creado'}`);
            await cargar();
            return true;
        } catch (error) {
            message.error(detalleDe(error, 'No se pudo guardar'));
            return false;
        } finally {
            setGuardando(false);
        }
    };

    const borrar = async (id) => {
        try {
            await eliminar(recurso, id);
            message.success(`${singular} eliminado`);
            await cargar();
        } catch (error) {
            message.error(detalleDe(error, 'No se pudo eliminar'));
        }
    };

    return { filas, cargando, guardando, cargar, guardar, borrar };
};
