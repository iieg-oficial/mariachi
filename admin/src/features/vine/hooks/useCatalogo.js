import { useCallback, useEffect, useState } from 'react';

import { getCatalogos } from '@features/vine/api/vineService';

const useCatalogo = (tipo, soloActivos = true) => {
    const [items, setItems] = useState([]);
    const [cargando, setCargando] = useState(true);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setItems(await getCatalogos(tipo, soloActivos));
        } catch {
            setItems([]);
        } finally {
            setCargando(false);
        }
    }, [tipo, soloActivos]);

    useEffect(() => { cargar(); }, [cargar]);

    const opciones = items.map((i) => ({ value: i.clave, label: i.nombre }));
    const color = Object.fromEntries(items.map((i) => [i.clave, i.color || 'default']));
    const nombre = Object.fromEntries(items.map((i) => [i.clave, i.nombre]));

    return { items, opciones, color, nombre, cargando, recargar: cargar };
};

export default useCatalogo;
