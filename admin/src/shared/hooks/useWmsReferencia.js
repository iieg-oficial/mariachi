import { useEffect, useRef } from 'react';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';

export const useWmsReferencia = (mapRef, { geoserverUrl, geoserverWorkspace, geoserverLayer, styles, cqlFilter }) => {
    const capaRef = useRef(null);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return undefined;
        if (capaRef.current) {
            map.removeLayer(capaRef.current);
            capaRef.current = null;
        }
        if (!geoserverUrl || !geoserverWorkspace || !geoserverLayer) return undefined;
        const capa = new ImageLayer({
            source: new ImageWMS({
                url: `${geoserverUrl.replace(/\/$/, '')}/${geoserverWorkspace}/wms`,
                params: {
                    LAYERS: `${geoserverWorkspace}:${geoserverLayer}`,
                    STYLES: '',
                    FORMAT: 'image/png',
                    TRANSPARENT: true,
                    VERSION: '1.1.0',
                },
                ratio: 1,
                serverType: 'geoserver',
            }),
            opacity: 0.7,
            zIndex: 10,
        });
        map.addLayer(capa);
        capaRef.current = capa;
        return () => {
            map.removeLayer(capa);
            capaRef.current = null;
        };
    }, [mapRef, geoserverUrl, geoserverWorkspace, geoserverLayer]);

    useEffect(() => {
        const capa = capaRef.current;
        if (!capa) return undefined;
        const espera = setTimeout(() => {
            const source = capa.getSource();
            if (!source) return;
            source.updateParams({ STYLES: styles || '', CQL_FILTER: cqlFilter || undefined });
        }, 250);
        return () => clearTimeout(espera);
    }, [styles, cqlFilter]);
};
