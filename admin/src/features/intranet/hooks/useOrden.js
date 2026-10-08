import { useState } from 'react';
import { message } from 'antd';
import { arrayMove } from '@dnd-kit/sortable';

import { actualizar } from '../api/intranetService';

const SIN_GRUPO = '';

const comparar = ({ campo, grupo }) => (a, b) => String(grupo ? a[grupo] ?? '' : '').localeCompare(String(grupo ? b[grupo] ?? '' : ''), 'es')
    || (a[campo] ?? 0) - (b[campo] ?? 0)
    || a.id - b.id;

const renumerar = (filas, { campo, grupo }) => {
    const cuentas = {};
    return filas.flatMap((fila) => {
        const clave = grupo ? fila[grupo] ?? SIN_GRUPO : SIN_GRUPO;
        cuentas[clave] = (cuentas[clave] ?? 0) + 1;
        return fila[campo] === cuentas[clave] ? [] : [[fila, cuentas[clave]]];
    });
};

export const useOrden = (recurso, ordenable, filas, recargar) => {
    const [locales, setLocales] = useState(null);
    const ordenadas = ordenable ? [...filas].sort(comparar(ordenable)) : filas;
    const visibles = locales ?? ordenadas;

    const soltar = async ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const desde = visibles.findIndex((fila) => fila.id === active.id);
        const hasta = visibles.findIndex((fila) => fila.id === over.id);
        const { campo, grupo, aPayload } = ordenable;
        if (grupo && visibles[desde][grupo] !== visibles[hasta][grupo]) {
            message.warning('Se ordena dentro de su misma sección');
            return;
        }
        const nuevas = arrayMove(visibles, desde, hasta);
        setLocales(nuevas);
        try {
            await Promise.all(renumerar(nuevas, ordenable).map(([fila, valor]) => (
                actualizar(recurso, fila.id, aPayload ? aPayload(fila, valor) : { [campo]: valor })
            )));
            message.success('Orden guardado');
        } catch {
            message.error('No se pudo guardar el orden');
        } finally {
            await recargar();
            setLocales(null);
        }
    };

    return { visibles, soltar };
};
