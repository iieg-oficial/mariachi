const VISTA_INICIAL = 'zoom=8.30&lat=20.850000&lon=-103.800000';

export const enlaceAlVisor = (layerId, origen = window.location.origin) => (
    layerId ? `${origen}/mapalab/mapa?${VISTA_INICIAL}&layers=${encodeURIComponent(layerId)}` : ''
);
