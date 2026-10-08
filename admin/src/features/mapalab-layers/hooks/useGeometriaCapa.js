import { useEffect, useState } from 'react';
import api from '@shared/services/api';

export function useGeometriaCapa(alias, capa) {
    const [geometria, setGeometria] = useState(null);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (!alias || !capa) {
            setGeometria(null);
            return undefined;
        }
        let cancelado = false;
        setCargando(true);
        setGeometria(null);
        api.get(`/geoserver/workspaces/${encodeURIComponent(alias)}/layers/${encodeURIComponent(capa)}/geometry`)
            .then((res) => { if (!cancelado) setGeometria(res.data?.geometryType || null); })
            .catch(() => { if (!cancelado) setGeometria(null); })
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, [alias, capa]);

    return { geometria, cargando };
}
