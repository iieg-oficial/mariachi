import { useEffect, useState } from 'react';
import { listGeoserverLayers } from '../api/catalogoService';

export const useGeoserverLayers = (alias) => {
    const [layers, setLayers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!alias) {
            setLayers([]);
            return undefined;
        }
        let active = true;
        setLoading(true);
        listGeoserverLayers(alias)
            .then((data) => { if (active) setLayers(data); })
            .catch(() => { if (active) setLayers([]); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [alias]);

    return { layers, loading };
};
