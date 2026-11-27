import { useEffect, useState } from 'react';
import InfoBoxPreview from '@features/mapalab-layers/components/layersEditor/InfoBoxPreview';
import { fetchSampleFeatures } from '@features/mapalab-layers/api/sampleFeaturesService';
import SideBySide from '@features/revision/components/SideBySide';

export default function InfoboxDiff({ publicado, cambios }) {
    const [muestra, setMuestra] = useState(null);
    const alias = cambios.workspaceAlias || publicado?.workspaceAlias;
    const capa = cambios.geoserverLayer || publicado?.geoserverLayer;

    useEffect(() => {
        if (!alias || !capa) return undefined;
        let activo = true;
        fetchSampleFeatures(alias, capa, 1)
            .then((features) => { if (activo) setMuestra(features[0]?.properties || null); })
            .catch(() => {});
        return () => { activo = false; };
    }, [alias, capa]);

    return (
        <SideBySide
            antes={<InfoBoxPreview value={publicado?.infoboxConfig || null} properties={muestra} />}
            despues={<InfoBoxPreview value={cambios.infoboxConfig || null} properties={muestra} />}
        />
    );
}
