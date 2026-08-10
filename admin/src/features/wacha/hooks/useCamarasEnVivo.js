import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';

import { getEstadoCamaras, listCamaras } from '../api/wachaService';

export default function useCamarasEnVivo() {
    const [camaras, setCamaras] = useState([]);
    const [estados, setEstados] = useState({});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);
    const [version, setVersion] = useState(0);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const lista = await listCamaras();
            setCamaras(lista.filter((c) => c.habilitada));
            try {
                setEstados(await getEstadoCamaras());
                setError(null);
            } catch {
                setEstados({});
                setError('No se pudo consultar el estado en wacha; el video puede no cargar.');
            }
        } catch {
            message.error('No se pudieron cargar las cámaras');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const recargarVideo = useCallback(() => setVersion((v) => v + 1), []);

    return { camaras, estados, cargando, error, version, cargar, recargarVideo };
}
