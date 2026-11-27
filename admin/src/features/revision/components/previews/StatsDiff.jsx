import { useEffect, useState } from 'react';
import StatsPreviewGrid from '@features/mapalab-layers/components/layersEditor/StatsPreviewGrid';
import { useLayerMetadataApi } from '@features/mapalab-layers/hooks/useLayerMetadataApi';
import SideBySide from '@features/revision/components/SideBySide';

const VACIO = [];
const nada = () => {};

const useValoresVivos = (layerKey, config) => {
    const { previewLayerStat } = useLayerMetadataApi();
    const [vivos, setVivos] = useState({});
    useEffect(() => {
        let activo = true;
        Promise.all(config.map(async (slot) => {
            if (slot.operation === 'static') return [slot.position, slot.value ?? null];
            try {
                const res = await previewLayerStat(layerKey, slot, null);
                return [slot.position, res?.value ?? null];
            } catch {
                return [slot.position, undefined];
            }
        })).then((entradas) => { if (activo) setVivos(Object.fromEntries(entradas)); });
        return () => { activo = false; };
    }, [layerKey, config, previewLayerStat]);
    return vivos;
};

export default function StatsDiff({ layerKey, publicado, cambios }) {
    const configAntes = publicado?.stats_config || VACIO;
    const configNuevo = cambios.stats_config ?? configAntes;
    const pieAntes = publicado?.pie_numeralia || '';
    const vivos = useValoresVivos(layerKey, configNuevo);
    return (
        <SideBySide
            antes={(
                <StatsPreviewGrid
                    config={configAntes}
                    values={publicado?.values || VACIO}
                    onSelect={nada}
                    canAdd={false}
                    pie={pieAntes}
                />
            )}
            despues={(
                <StatsPreviewGrid
                    config={configNuevo}
                    liveValues={vivos}
                    onSelect={nada}
                    canAdd={false}
                    pie={cambios.pie_numeralia ?? pieAntes}
                />
            )}
        />
    );
}
