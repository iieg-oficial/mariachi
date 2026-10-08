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
    // Vinculo y area se guardan por nombre, no por clave: el CASE del backend
    // deriva nombres —«Plantilla», «Baja»— y los colores y filtros del CMS los
    // buscan por nombre. Guardar la clave dejaria «plantilla» sin color ni filtro.
    const opcionesNombre = items.map((i) => ({ value: i.nombre, label: i.nombre }));
    const color = Object.fromEntries(items.map((i) => [i.clave, i.color || 'default']));
    const nombre = Object.fromEntries(items.map((i) => [i.clave, i.nombre]));

    return { items, opciones, opcionesNombre, color, nombre, cargando, recargar: cargar };
};

export default useCatalogo;
