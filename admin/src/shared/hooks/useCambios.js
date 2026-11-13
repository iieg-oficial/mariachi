import { useEffect, useRef } from 'react';
import { escucharCambios } from '@shared/services/cambios';
import { useAuth } from '@shared/contexts/useAuth';

const ESPERA_MS = 400;

export default function useCambios(recursos, alCambiar, { incluirPropios = false } = {}) {
    const { user } = useAuth();
    const alCambiarRef = useRef(alCambiar);
    const clave = [].concat(recursos).join(',');
    const yo = user?.username;

    useEffect(() => {
        alCambiarRef.current = alCambiar;
    }, [alCambiar]);

    useEffect(() => {
        const lista = clave.split(',');
        let timer = null;
        let lote = [];
        const quitar = escucharCambios((evento) => {
            const reconexion = evento.tipo === 'reconectado';
            if (!reconexion) {
                if (evento.tipo !== 'cambio' || !lista.includes(evento.recurso)) return;
                if (!incluirPropios && evento.autor && evento.autor === yo) return;
            }
            lote.push(evento);
            clearTimeout(timer);
            timer = setTimeout(() => {
                const entregados = lote;
                lote = [];
                alCambiarRef.current?.(entregados);
            }, ESPERA_MS);
        });
        return () => {
            clearTimeout(timer);
            quitar();
        };
    }, [clave, incluirPropios, yo]);
}
