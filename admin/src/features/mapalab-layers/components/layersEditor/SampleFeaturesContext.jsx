import { useEffect, useMemo, useState } from 'react';
import { fetchSampleFeatures } from '@features/mapalab-layers/api/sampleFeaturesService';
import { SampleFeaturesContext } from './sampleFeaturesContext';

const MAX_MUESTRAS = 3;

export const SampleFeaturesProvider = ({ workspaceAlias, geoserverLayer, children }) => {
    const [features, setFeatures] = useState([]);

    useEffect(() => {
        if (!workspaceAlias || !geoserverLayer) { setFeatures([]); return; }
        let cancelado = false;
        fetchSampleFeatures(workspaceAlias, geoserverLayer, 10)
            .then((f) => { if (!cancelado) setFeatures(f); })
            .catch(() => { if (!cancelado) setFeatures([]); });
        return () => { cancelado = true; };
    }, [workspaceAlias, geoserverLayer]);

    const valor = useMemo(() => {
        const porCampo = new Map();
        features.forEach(({ properties }) => {
            Object.entries(properties || {}).forEach(([campo, v]) => {
                if (v === null || v === undefined || String(v).trim() === '') return;
                const previos = porCampo.get(campo) || [];
                const texto = String(v);
                if (previos.length < MAX_MUESTRAS && !previos.includes(texto)) {
                    porCampo.set(campo, [...previos, texto]);
                }
            });
        });
        return { features, samplesOf: (campo) => porCampo.get(campo) || [] };
    }, [features]);

    return (
        <SampleFeaturesContext.Provider value={valor}>
            {children}
        </SampleFeaturesContext.Provider>
    );
};

