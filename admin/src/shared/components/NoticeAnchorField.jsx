import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Space, Tag, Typography } from 'antd';
import { AimOutlined, ClearOutlined } from '@ant-design/icons';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Icon as OlIcon, Circle as CircleStyle, Stroke, Fill } from 'ol/style';
import { cartoBasemapUrl, CARTO_ATTRIBUTIONS } from '@shared/helpers/cartoBasemap';

const { Text } = Typography;

const JALISCO_CENTER_4326 = [-103.35, 20.66];

const round = (n, dec = 6) => (Number.isFinite(n) ? Number(n.toFixed(dec)) : null);

const rutaStyle = [
    new Style({ stroke: new Stroke({ color: '#FFFFFF', width: 5 }) }),
    new Style({ stroke: new Stroke({ color: '#FF8300', width: 2, lineDash: [8, 6] }) }),
];

const verticeStyle = new Style({
    image: new CircleStyle({
        radius: 5,
        fill: new Fill({ color: '#FF8300' }),
        stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
    }),
});

const markerStyle = new Style({
    image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: '#FF8300' }),
        stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
    }),
});

export default function NoticeAnchorField({
    value,
    onChange,
    disabled,
    geoserverUrl,
    geoserverWorkspace,
    geoserverLayer,
    styles,
    cqlFilter,
    zoomRange,
    defaultZoom,
    height = 360,
    layerHint = true,
    ruta = null,
    onRutaChange,
    enRuta = false,
    hint = 'Click sobre el mapa para fijar el punto. El rango de zoom se define en el control de abajo.',
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markerSourceRef = useRef(null);
    const rutaSourceRef = useRef(null);
    const wmsLayerRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const defaultZoomRef = useRef(defaultZoom);
    const [currentZoom, setCurrentZoom] = useState(null);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { defaultZoomRef.current = defaultZoom; }, [defaultZoom]);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return undefined;

        const markerSource = new VectorSource();
        markerSourceRef.current = markerSource;

        const rutaSource = new VectorSource();
        rutaSourceRef.current = rutaSource;

        const baseTile = new TileLayer({
            source: new XYZ({
                url: cartoBasemapUrl(),
                maxZoom: 19,
                attributions: CARTO_ATTRIBUTIONS,
            }),
        });

        const markerLayer = new VectorLayer({
            source: markerSource,
            style: markerStyle,
            zIndex: 100,
        });

        const rutaLayer = new VectorLayer({ source: rutaSource, zIndex: 90 });

        const dz = defaultZoomRef.current;
        const initialCenter = (dz && Number.isFinite(dz.lon) && Number.isFinite(dz.lat))
            ? [dz.lon, dz.lat]
            : JALISCO_CENTER_4326;
        const initialZoom = (dz && Number.isFinite(dz.zoom)) ? dz.zoom : 7;
        const map = new Map({
            target: containerRef.current,
            layers: [baseTile, rutaLayer, markerLayer],
            view: new View({
                center: fromLonLat(initialCenter),
                zoom: initialZoom,
            }),
            controls: [],
        });
        mapRef.current = map;

        return () => {
            map.setTarget(null);
            mapRef.current = null;
            markerSourceRef.current = null;
            wmsLayerRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return undefined;
        if (wmsLayerRef.current) {
            map.removeLayer(wmsLayerRef.current);
            wmsLayerRef.current = null;
        }
        if (!geoserverUrl || !geoserverWorkspace || !geoserverLayer) return undefined;
        const wmsLayer = new ImageLayer({
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
        map.addLayer(wmsLayer);
        wmsLayerRef.current = wmsLayer;
        return () => {
            map.removeLayer(wmsLayer);
            wmsLayerRef.current = null;
        };
    }, [geoserverUrl, geoserverWorkspace, geoserverLayer]);

    useEffect(() => {
        const wmsLayer = wmsLayerRef.current;
        if (!wmsLayer) return undefined;
        const handle = setTimeout(() => {
            const source = wmsLayer.getSource();
            if (!source) return;
            const params = { STYLES: styles || '' };
            if (cqlFilter) params.CQL_FILTER = cqlFilter;
            else params.CQL_FILTER = undefined;
            source.updateParams(params);
        }, 250);
        return () => clearTimeout(handle);
    }, [styles, cqlFilter]);

    useEffect(() => {
        const source = markerSourceRef.current;
        if (!source) return;
        source.clear();
        if (value && Number.isFinite(value.lon) && Number.isFinite(value.lat)) {
            const f = new Feature({ geometry: new Point(fromLonLat([value.lon, value.lat])) });
            source.addFeature(f);
        }
    }, [value]);

    useEffect(() => {
        const source = rutaSourceRef.current;
        if (!source) return;
        source.clear();
        const puntos = (Array.isArray(ruta) ? ruta : []).filter((p) => Number.isFinite(p?.lon) && Number.isFinite(p?.lat));
        if (puntos.length === 0) return;
        const conFinal = value && Number.isFinite(value.lon) ? [...puntos, value] : puntos;
        const coords = conFinal.map((p) => fromLonLat([p.lon, p.lat]));
        if (coords.length > 1) {
            const linea = new Feature({ geometry: new LineString(coords) });
            linea.setStyle(rutaStyle);
            source.addFeature(linea);
        }
        puntos.forEach((p) => {
            const f = new Feature({ geometry: new Point(fromLonLat([p.lon, p.lat])) });
            f.setStyle(verticeStyle);
            source.addFeature(f);
        });
    }, [ruta, value]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return undefined;
        const handler = (evt) => {
            if (disabled) return;
            const [lon, lat] = toLonLat(evt.coordinate);
            const punto = { lon: round(lon), lat: round(lat) };
            if (enRuta && onRutaChange) {
                onRutaChange([...(Array.isArray(ruta) ? ruta : []), punto]);
                return;
            }
            onChangeRef.current?.(punto);
        };
        map.on('click', handler);
        return () => map.un('click', handler);
    }, [disabled, enRuta, onRutaChange, ruta]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return undefined;
        const view = map.getView();
        const update = () => {
            const z = view.getZoom();
            setCurrentZoom(typeof z === 'number' ? Math.round(z * 10) / 10 : null);
        };
        update();
        view.on('change:resolution', update);
        return () => view.un('change:resolution', update);
    }, []);

    const zoomRangeActive = useMemo(() => {
        if (currentZoom == null) return null;
        const min = zoomRange?.min;
        const max = zoomRange?.max;
        if (min == null && max == null) return null;
        if (min != null && currentZoom < min) return false;
        if (max != null && currentZoom > max) return false;
        return true;
    }, [currentZoom, zoomRange?.min, zoomRange?.max]);

    const fitToMarker = () => {
        const map = mapRef.current;
        if (!map || !value) return;
        map.getView().animate({ center: fromLonLat([value.lon, value.lat]), zoom: 12, duration: 300 });
    };

    const clear = () => onChangeRef.current?.(null);

    return (
        <Space orientation="vertical" style={{ width: '100%' }} size={6}>
            {layerHint && !geoserverLayer && (
                <Alert
                    type="warning"
                    showIcon
                    title="Sin capa configurada"
                    description="Configura workspace y capa GeoServer en el tab Servicios para ver la capa como referencia."
                />
            )}
            <div style={{ position: 'relative' }}>
                <div ref={containerRef} style={{ width: '100%', height, border: '1px solid #d9d9d9', borderRadius: 6 }} />
                {currentZoom != null && (
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: 'rgba(255,255,255,0.92)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                    }}>
                        <span>Zoom: <strong>{currentZoom}</strong></span>
                        {(zoomRange?.min != null || zoomRange?.max != null) && (
                            <Tag
                                color={zoomRangeActive === false ? 'red' : (zoomRangeActive ? 'green' : 'default')}
                                style={{ margin: 0 }}
                            >
                                Rango: {zoomRange?.min ?? '−∞'} – {zoomRange?.max ?? '+∞'}
                            </Tag>
                        )}
                    </div>
                )}
            </div>
            <Space size={6} wrap>
                <Button size="small" icon={<AimOutlined />} disabled={!value} onClick={fitToMarker}>
                    Centrar al punto
                </Button>
                <Button size="small" icon={<ClearOutlined />} disabled={!value || disabled} onClick={clear}>
                    Limpiar punto
                </Button>
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>
                {hint}
            </Text>
            {value && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                    lon: {value.lon}, lat: {value.lat}
                </Text>
            )}
        </Space>
    );
}
