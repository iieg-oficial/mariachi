import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
    listRendimiento,
    listSitios,
    listUso,
} from '@features/mapalab-api-keys/api/mapalabApiKeysService';
import {
    diaDe,
    resumirSitios,
    seriePorDia,
    totalesDelPeriodo,
} from '@features/mapalab-api-keys/hooks/usoHelpers';


export function useApiKeyUso(apiKeyId, dias) {
    const [datos, setDatos] = useState({ uso: [], rendimiento: [], sitios: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const desde = useMemo(() => dayjs().subtract(dias - 1, 'day').format('YYYY-MM-DD'), [dias]);

    const cargar = useCallback(async () => {
        if (!apiKeyId) return;
        setLoading(true);
        setError(null);
        try {
            const hasta = dayjs().format('YYYY-MM-DD');
            const [uso, rendimiento, sitios] = await Promise.all([
                listUso(apiKeyId, dias),
                listRendimiento(apiKeyId, { desde, hasta }),
                listSitios(apiKeyId, { desde, hasta }),
            ]);
            setDatos({
                uso: (uso || []).filter((fila) => diaDe(fila.dia) >= desde),
                rendimiento: rendimiento || [],
                sitios: sitios || [],
            });
        } catch (err) {
            setError(err?.response?.data?.detail || 'No se pudo cargar el uso de la llave');
        } finally {
            setLoading(false);
        }
    }, [apiKeyId, dias, desde]);

    useEffect(() => { cargar(); }, [cargar]);

    const resumen = useMemo(() => ({
        totales: totalesDelPeriodo(datos.sitios, datos.uso),
        porSitio: resumirSitios(datos.sitios, datos.rendimiento),
        porDia: seriePorDia(desde, dias, datos.sitios, datos.uso),
    }), [datos, desde, dias]);

    return { ...resumen, loading, error, recargar: cargar };
}
