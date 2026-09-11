import { useCallback, useEffect, useRef } from 'react';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { BRAND } from '@app/providers/brand';
import { cartoBasemapUrl, CARTO_ATTRIBUTIONS } from '@shared/helpers/cartoBasemap';

const INICIO = { center: fromLonLat([-103.6, 20.7]), zoom: 5.6 };
const REGRESO_MS = 1200;

const estiloMarca = new Style({
    image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: BRAND.orange }),
        stroke: new Stroke({ color: '#FFFFFF', width: 2.5 }),
    }),
});

export function useMapaDePrueba(targetRef) {
    const mapRef = useRef(null);
    const marcaRef = useRef(null);

    useEffect(() => {
        const target = targetRef.current;
        if (!target) return undefined;
        const marca = new VectorSource();
        marcaRef.current = marca;
        const map = new OlMap({
            target,
            layers: [
                new TileLayer({ source: new XYZ({ url: cartoBasemapUrl(), maxZoom: 19, attributions: CARTO_ATTRIBUTIONS }) }),
                new VectorLayer({ source: marca, style: estiloMarca, zIndex: 10 }),
            ],
            view: new View({ ...INICIO }),
            controls: [],
            interactions: [],
        });
        mapRef.current = map;
        const observador = new ResizeObserver(() => map.updateSize());
        observador.observe(target);
        return () => {
            observador.disconnect();
            map.setTarget(null);
            mapRef.current = null;
            marcaRef.current = null;
        };
    }, [targetRef]);

    const reiniciar = useCallback(() => {
        const view = mapRef.current?.getView();
        if (!view) return;
        view.cancelAnimations();
        marcaRef.current?.clear();
        view.setCenter(INICIO.center);
        view.setZoom(INICIO.zoom);
    }, []);

    const viajar = useCallback((destino, duracion, alLlegar) => {
        const view = mapRef.current?.getView();
        if (!view) return;
        const centro = fromLonLat([destino.lon, destino.lat]);
        const llegar = () => {
            marcaRef.current?.addFeature(new Feature(new Point(centro)));
            alLlegar?.();
        };
        if (duracion <= 0) {
            view.setCenter(centro);
            view.setZoom(destino.zoom);
            llegar();
            return;
        }
        let pendientes = 2;
        const alTerminar = (completo) => {
            pendientes -= 1;
            if (completo && pendientes === 0) llegar();
        };
        const alto = Math.min(view.getZoom(), destino.zoom) - 1;
        view.animate({ center: centro, duration: duracion }, alTerminar);
        view.animate({ zoom: alto, duration: duracion * 0.35 }, { zoom: destino.zoom, duration: duracion * 0.65 }, alTerminar);
    }, []);

    const volver = useCallback(() => {
        const view = mapRef.current?.getView();
        if (!view) return;
        view.cancelAnimations();
        marcaRef.current?.clear();
        view.animate({ center: INICIO.center, zoom: INICIO.zoom, duration: REGRESO_MS });
    }, []);

    return { reiniciar, viajar, volver };
}
