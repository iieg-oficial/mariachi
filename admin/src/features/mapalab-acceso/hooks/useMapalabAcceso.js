import { useCallback, useEffect, useState } from 'react';
import { message } from '@shared/services/message';
import {
    leerArbol,
    listarCapasPrivadas,
    listarGrupos,
    listarUsuarios,
} from '@features/mapalab-acceso/api/mapalabAccesoService';

export const errorDe = (err, respaldo) => err?.response?.data?.detail || respaldo;

export const useMapalabAcceso = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [capas, setCapas] = useState([]);
    const [arbol, setArbol] = useState([]);
    const [cargando, setCargando] = useState(true);

    const recargar = useCallback(async () => {
        setCargando(true);
        try {
            const [u, g, c] = await Promise.all([listarUsuarios(), listarGrupos(), listarCapasPrivadas()]);
            setUsuarios(u);
            setGrupos(g);
            setCapas(c);
        } catch (err) {
            message.error(errorDe(err, 'No se pudo cargar el acceso a capas privadas'));
        } finally {
            setCargando(false);
        }
    }, []);

    const recargarArbol = useCallback(async () => {
        try {
            setArbol(await leerArbol());
        } catch (err) {
            message.error(errorDe(err, 'No se pudo cargar el árbol de capas'));
        }
    }, []);

    useEffect(() => {
        recargar();
        recargarArbol();
    }, [recargar, recargarArbol]);

    const ejecutar = useCallback(async (accion, exito, fallo) => {
        try {
            const resultado = await accion();
            if (exito) message.success(exito);
            await recargar();
            return resultado;
        } catch (err) {
            message.error(errorDe(err, fallo));
            return null;
        }
    }, [recargar]);

    return { usuarios, grupos, capas, arbol, cargando, recargar, recargarArbol, ejecutar };
};
