import { useEffect } from 'react';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import { toLonLat } from 'ol/proj';

const redondear = (n) => Number(n.toFixed(6));

export const diezmar = (puntos, maximo) => {
    if (!Array.isArray(puntos) || puntos.length <= maximo) return puntos || [];
    const paso = (puntos.length - 1) / (maximo - 1);
    return Array.from({ length: maximo }, (_, i) => puntos[Math.round(i * paso)]);
};

export const useTrazoOl = (mapRef, { activo, maximo = 12, alTrazar }) => {
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !activo) return undefined;
        const dibujo = new Draw({ type: 'LineString' });
        const terminar = (evt) => {
            const coords = evt.feature.getGeometry().getCoordinates();
            const puntos = coords.map((c) => {
                const [lon, lat] = toLonLat(c);
                return { lon: redondear(lon), lat: redondear(lat) };
            });
            alTrazar?.(diezmar(puntos, maximo));
        };
        dibujo.on('drawend', terminar);
        map.addInteraction(dibujo);
        return () => {
            dibujo.un('drawend', terminar);
            map.removeInteraction(dibujo);
        };
    }, [mapRef, activo, maximo, alTrazar]);
};

export const useEditarTrazoOl = (mapRef, { activo, sourceRef, maximo = 12, alEditar }) => {
    useEffect(() => {
        const map = mapRef.current;
        const source = sourceRef?.current;
        if (!map || !activo || !source) return undefined;
        const edicion = new Modify({ source });
        const terminar = () => {
            const linea = source.getFeatures().find((f) => f.getGeometry()?.getType() === 'LineString');
            if (!linea) return;
            const puntos = linea.getGeometry().getCoordinates().map((c) => {
                const [lon, lat] = toLonLat(c);
                return { lon: redondear(lon), lat: redondear(lat) };
            });
            alEditar?.(diezmar(puntos, maximo));
        };
        edicion.on('modifyend', terminar);
        map.addInteraction(edicion);
        return () => {
            edicion.un('modifyend', terminar);
            map.removeInteraction(edicion);
        };
    }, [mapRef, sourceRef, activo, maximo, alEditar]);
};
