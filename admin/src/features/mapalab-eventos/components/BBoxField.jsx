import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, InputNumber, Radio, Space, Typography } from 'antd';
import { AimOutlined, ClearOutlined } from '@ant-design/icons';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import { fromExtent } from 'ol/geom/Polygon';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import Draw, { createBox } from 'ol/interaction/Draw';
import { fromLonLat, transformExtent } from 'ol/proj';
import { register as registerProj4 } from 'ol/proj/proj4';
import { Style, Stroke, Fill } from 'ol/style';
import proj4 from 'proj4';

const { Text } = Typography;

proj4.defs('EPSG:6368', '+proj=utm +zone=14 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
registerProj4(proj4);

const JALISCO_CENTER_4326 = [-103.35, 20.66];
const JALISCO_EXTENT_4326 = [-105.7, 18.9, -101.5, 22.7];

const round = (n, dec = 6) => Number.isFinite(n) ? Number(n.toFixed(dec)) : null;

const isCompleteBbox = (b) => b
    && Number.isFinite(b.minx) && Number.isFinite(b.miny)
    && Number.isFinite(b.maxx) && Number.isFinite(b.maxy);

function deriveInitialMode(value) {
    if (!value || !isCompleteBbox(value)) return 'none';
    return 'manual';
}

function reproject(coords, from, to) {
    if (from === to) return coords;
    return proj4(from, to, coords);
}

function bbox4326ToCrs(b, crs) {
    if (!isCompleteBbox(b)) return { minx: '', miny: '', maxx: '', maxy: '' };
    if (crs === 'EPSG:4326') return b;
    const [minx, miny] = reproject([b.minx, b.miny], 'EPSG:4326', crs);
    const [maxx, maxy] = reproject([b.maxx, b.maxy], 'EPSG:4326', crs);
    return { minx: round(minx, 2), miny: round(miny, 2), maxx: round(maxx, 2), maxy: round(maxy, 2) };
}

function bboxCrsTo4326(b, crs) {
    if (!isCompleteBbox(b)) return null;
    if (crs === 'EPSG:4326') return b;
    const [minx, miny] = reproject([b.minx, b.miny], crs, 'EPSG:4326');
    const [maxx, maxy] = reproject([b.maxx, b.maxy], crs, 'EPSG:4326');
    return { minx: round(minx), miny: round(miny), maxx: round(maxx), maxy: round(maxy) };
}

function MiniMap({ value, onChange, disabled }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const sourceRef = useRef(null);
    const drawRef = useRef(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const source = new VectorSource();
        sourceRef.current = source;

        const vectorLayer = new VectorLayer({
            source,
            style: new Style({
                stroke: new Stroke({ color: '#1677ff', width: 2 }),
                fill: new Fill({ color: 'rgba(22,119,255,0.12)' }),
            }),
        });

        const map = new Map({
            target: containerRef.current,
            layers: [
                new TileLayer({
                    source: new XYZ({
                        url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                        maxZoom: 19,
                        attributions: '© OpenStreetMap, © CARTO',
                    }),
                }),
                vectorLayer,
            ],
            view: new View({
                center: fromLonLat(JALISCO_CENTER_4326),
                zoom: 6,
            }),
            controls: [],
        });
        mapRef.current = map;

        const ext = transformExtent(JALISCO_EXTENT_4326, 'EPSG:4326', 'EPSG:3857');
        map.getView().fit(ext, { padding: [20, 20, 20, 20] });

        return () => {
            map.setTarget(null);
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const source = sourceRef.current;
        if (!source) return;
        source.clear();
        if (isCompleteBbox(value)) {
            const ext3857 = transformExtent(
                [value.minx, value.miny, value.maxx, value.maxy],
                'EPSG:4326', 'EPSG:3857',
            );
            source.addFeature(new Feature({ geometry: fromExtent(ext3857) }));
        }
    }, [value]);

    useEffect(() => {
        const map = mapRef.current;
        const source = sourceRef.current;
        if (!map || !source) return;
        if (drawRef.current) {
            map.removeInteraction(drawRef.current);
            drawRef.current = null;
        }
        if (disabled) return;

        const draw = new Draw({
            source,
            type: 'Circle',
            geometryFunction: createBox(),
        });
        draw.on('drawstart', () => source.clear());
        draw.on('drawend', (e) => {
            const ext3857 = e.feature.getGeometry().getExtent();
            const ext4326 = transformExtent(ext3857, 'EPSG:3857', 'EPSG:4326');
            onChangeRef.current?.({
                minx: round(ext4326[0]),
                miny: round(ext4326[1]),
                maxx: round(ext4326[2]),
                maxy: round(ext4326[3]),
            });
        });
        map.addInteraction(draw);
        drawRef.current = draw;
        return () => {
            map.removeInteraction(draw);
            drawRef.current = null;
        };
    }, [disabled]);

    const fitToBbox = () => {
        const map = mapRef.current;
        if (!map || !isCompleteBbox(value)) return;
        const ext3857 = transformExtent(
            [value.minx, value.miny, value.maxx, value.maxy],
            'EPSG:4326', 'EPSG:3857',
        );
        map.getView().fit(ext3857, { padding: [20, 20, 20, 20], duration: 300 });
    };

    const clear = () => {
        sourceRef.current?.clear();
        onChangeRef.current?.(null);
    };

    return (
        <Space orientation="vertical" style={{ width: '100%' }} size={6}>
            <div ref={containerRef} style={{ width: '100%', height: 320, border: '1px solid #d9d9d9', borderRadius: 6 }} />
            <Space size={6} wrap>
                <Button size="small" icon={<AimOutlined />} disabled={!isCompleteBbox(value)} onClick={fitToBbox}>
                    Centrar al bbox
                </Button>
                <Button size="small" icon={<ClearOutlined />} disabled={!isCompleteBbox(value) || disabled} onClick={clear}>
                    Limpiar
                </Button>
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Click y arrastra sobre el mapa para dibujar el rectángulo.
                </Text>
            </Space>
            {isCompleteBbox(value) && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                    bbox EPSG:4326: {value.minx}, {value.miny} → {value.maxx}, {value.maxy}
                </Text>
            )}
        </Space>
    );
}

const RANGES_4326 = { minx: [-180, 180], miny: [-90, 90], maxx: [-180, 180], maxy: [-90, 90] };

function ManualInputs({ value, onChange, disabled, crs }) {
    const displayed = useMemo(() => bbox4326ToCrs(value, crs), [value, crs]);

    const update = (key, val) => {
        const next = { ...displayed, [key]: val };
        if (!isCompleteBbox(next)) {
            onChange?.(null);
            return;
        }
        const as4326 = bboxCrsTo4326(next, crs);
        if (crs === 'EPSG:4326') {
            const [, lonMax] = RANGES_4326.minx;
            const [, latMax] = RANGES_4326.miny;
            if (
                Math.abs(as4326.minx) > lonMax || Math.abs(as4326.maxx) > lonMax
                || Math.abs(as4326.miny) > latMax || Math.abs(as4326.maxy) > latMax
            ) return;
            if (as4326.maxx < as4326.minx || as4326.maxy < as4326.miny) return;
        }
        onChange?.(as4326);
    };

    const labels = crs === 'EPSG:4326'
        ? { minx: 'min lon (oeste)', miny: 'min lat (sur)', maxx: 'max lon (este)', maxy: 'max lat (norte)' }
        : { minx: 'min X (m)', miny: 'min Y (m)', maxx: 'max X (m)', maxy: 'max Y (m)' };
    const step = crs === 'EPSG:4326' ? 0.0001 : 1;
    const ranges = crs === 'EPSG:4326' ? RANGES_4326 : null;

    return (
        <Space wrap>
            {(['minx', 'miny', 'maxx', 'maxy']).map((key) => {
                const range = ranges?.[key];
                return (
                    <Space key={key} orientation="vertical" size={0}>
                        <Text style={{ fontSize: 11 }}>{labels[key]}</Text>
                        <InputNumber
                            value={displayed[key]}
                            onChange={(val) => update(key, val)}
                            step={step}
                            min={range?.[0]}
                            max={range?.[1]}
                            disabled={disabled}
                            aria-label={labels[key]}
                            style={{ width: 150 }}
                        />
                    </Space>
                );
            })}
        </Space>
    );
}

export default function BBoxField({ value, onChange, disabled }) {
    const [mode, setMode] = useState(() => deriveInitialMode(value));
    const [crs, setCrs] = useState('EPSG:4326');

    const handleModeChange = (e) => {
        const next = e.target.value;
        setMode(next);
        if (next === 'none') onChange?.(null);
    };

    return (
        <Space orientation="vertical" style={{ width: '100%' }} size={10}>
            <Radio.Group value={mode} onChange={handleModeChange} disabled={disabled} optionType="button" buttonStyle="solid" size="small">
                <Radio.Button value="none">Sin zoom</Radio.Button>
                <Radio.Button value="manual">Coordenadas manuales</Radio.Button>
                <Radio.Button value="visual">Dibujar en mapa</Radio.Button>
            </Radio.Group>

            {mode === 'none' && (
                <Alert closable={false} type="info" showIcon
                    message="Sin zoom"
                    description="El visor abrirá el evento sin hacer zoom a un área específica."
                />
            )}

            {mode === 'manual' && (
                <Space orientation="vertical" style={{ width: '100%' }} size={6}>
                    <Space size={6}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Sistema de coordenadas:</Text>
                        <Radio.Group value={crs} onChange={(e) => setCrs(e.target.value)} disabled={disabled} size="small">
                            <Radio.Button value="EPSG:4326">EPSG:4326 (lon/lat)</Radio.Button>
                            <Radio.Button value="EPSG:6368">EPSG:6368 (UTM 14N)</Radio.Button>
                        </Radio.Group>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {crs === 'EPSG:4326'
                            ? 'Longitud/latitud en grados decimales. Se persiste como EPSG:4326.'
                            : 'Coordenadas planas en metros (México UTM 14N). Se reproyecta a EPSG:4326 al guardar.'}
                    </Text>
                    <ManualInputs value={value} onChange={onChange} disabled={disabled} crs={crs} />
                </Space>
            )}

            {mode === 'visual' && (
                <MiniMap value={value} onChange={onChange} disabled={disabled} />
            )}
        </Space>
    );
}
