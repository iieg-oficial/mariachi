import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Collapse, InputNumber, Radio, Space, Tag, Typography } from 'antd';
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
import { fromLonLat, transformExtent } from 'ol/proj';
import { register as registerProj4 } from 'ol/proj/proj4';
import { Style, Stroke, Fill } from 'ol/style';
import proj4 from 'proj4';

const { Text } = Typography;

proj4.defs('EPSG:6368', '+proj=utm +zone=14 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
registerProj4(proj4);

const JALISCO_CENTER_4326 = [-103.35, 20.66];
const JALISCO_EXTENT_4326 = [-105.7, 18.9, -101.5, 22.7];
const AUTO_DEBOUNCE_MS = 250;

const round = (n, dec = 6) => Number.isFinite(n) ? Number(n.toFixed(dec)) : null;

const isCompleteBbox = (b) => b
    && Number.isFinite(b.minx) && Number.isFinite(b.miny)
    && Number.isFinite(b.maxx) && Number.isFinite(b.maxy);

const extent4326FromMap = (map) => {
    const size = map.getSize();
    if (!size) return null;
    const ext3857 = map.getView().calculateExtent(size);
    const [minx, miny, maxx, maxy] = transformExtent(ext3857, 'EPSG:3857', 'EPSG:4326');
    return { minx: round(minx), miny: round(miny), maxx: round(maxx), maxy: round(maxy) };
};

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

function MapPicker({ value, onChange, disabled }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const sourceRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const [captureMode, setCaptureMode] = useState('manual');

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return undefined;

        const source = new VectorSource();
        sourceRef.current = source;

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
                new VectorLayer({
                    source,
                    style: new Style({
                        stroke: new Stroke({ color: '#1677ff', width: 2 }),
                        fill: new Fill({ color: 'rgba(22,119,255,0.12)' }),
                    }),
                }),
            ],
            view: new View({ center: fromLonLat(JALISCO_CENTER_4326), zoom: 6 }),
            controls: [],
        });
        mapRef.current = map;
        const ext = transformExtent(JALISCO_EXTENT_4326, 'EPSG:4326', 'EPSG:3857');
        map.getView().fit(ext, { padding: [20, 20, 20, 20] });

        return () => { map.setTarget(null); mapRef.current = null; };
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

    const captureCurrentView = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        const next = extent4326FromMap(map);
        if (next) onChangeRef.current?.(next);
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || captureMode !== 'auto' || disabled) return undefined;
        let timer = null;
        const view = map.getView();
        const handler = () => {
            clearTimeout(timer);
            timer = setTimeout(captureCurrentView, AUTO_DEBOUNCE_MS);
        };
        view.on('moveend', handler);
        captureCurrentView();
        return () => { clearTimeout(timer); view.un('moveend', handler); };
    }, [captureMode, disabled, captureCurrentView]);

    const fitToBbox = () => {
        const map = mapRef.current;
        if (!map || !isCompleteBbox(value)) return;
        const ext3857 = transformExtent(
            [value.minx, value.miny, value.maxx, value.maxy],
            'EPSG:4326', 'EPSG:3857',
        );
        map.getView().fit(ext3857, { padding: [20, 20, 20, 20], duration: 300 });
    };

    const clear = () => onChangeRef.current?.(null);

    return (
        <Space direction="vertical" style={{ width: '100%' }} size={6}>
            <Space size={6} wrap>
                <Text type="secondary" style={{ fontSize: 12 }}>Captura:</Text>
                <Radio.Group value={captureMode} onChange={(e) => setCaptureMode(e.target.value)} disabled={disabled} size="small">
                    <Radio.Button value="manual">Usar esta vista</Radio.Button>
                    <Radio.Button value="auto">Automático</Radio.Button>
                </Radio.Group>
                {captureMode === 'manual' && (
                    <Button size="small" type="primary" icon={<AimOutlined />} onClick={captureCurrentView} disabled={disabled}>
                        Usar esta vista
                    </Button>
                )}
                <Button size="small" icon={<ClearOutlined />} onClick={clear} disabled={!isCompleteBbox(value) || disabled}>
                    Limpiar
                </Button>
                {isCompleteBbox(value) && (
                    <Button size="small" onClick={fitToBbox}>Centrar al bbox</Button>
                )}
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>
                {captureMode === 'auto'
                    ? 'Al hacer pan o zoom el bbox se actualiza automáticamente.'
                    : 'Navega el mapa al área que cubre el evento y presiona "Usar esta vista".'}
            </Text>
            <div ref={containerRef} style={{ width: '100%', height: 320, border: '1px solid #d9d9d9', borderRadius: 6 }} />
            {isCompleteBbox(value) && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                    bbox EPSG:4326: {value.minx}, {value.miny} → {value.maxx}, {value.maxy}
                </Text>
            )}
        </Space>
    );
}

const RANGES_4326 = { minx: [-180, 180], miny: [-90, 90], maxx: [-180, 180], maxy: [-90, 90] };

function ManualInputs({ value, onChange, disabled }) {
    const [crs, setCrs] = useState('EPSG:4326');
    const displayed = useMemo(() => bbox4326ToCrs(value, crs), [value, crs]);

    const update = (key, val) => {
        const next = { ...displayed, [key]: val };
        if (!isCompleteBbox(next)) { onChange?.(null); return; }
        const as4326 = bboxCrsTo4326(next, crs);
        if (crs === 'EPSG:4326') {
            const [, lonMax] = RANGES_4326.minx;
            const [, latMax] = RANGES_4326.miny;
            if (Math.abs(as4326.minx) > lonMax || Math.abs(as4326.maxx) > lonMax
                || Math.abs(as4326.miny) > latMax || Math.abs(as4326.maxy) > latMax) return;
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
        <Space direction="vertical" style={{ width: '100%' }} size={6}>
            <Space size={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>Sistema de coordenadas:</Text>
                <Radio.Group value={crs} onChange={(e) => setCrs(e.target.value)} disabled={disabled} size="small">
                    <Radio.Button value="EPSG:4326">EPSG:4326 (lon/lat)</Radio.Button>
                    <Radio.Button value="EPSG:6368">EPSG:6368 (UTM 14N)</Radio.Button>
                </Radio.Group>
            </Space>
            <Space wrap>
                {(['minx', 'miny', 'maxx', 'maxy']).map((key) => {
                    const range = ranges?.[key];
                    return (
                        <Space key={key} direction="vertical" size={0}>
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
        </Space>
    );
}

const deriveInitialMode = (value) => (isCompleteBbox(value) ? 'view' : 'none');

export default function BBoxField({ value, onChange, disabled }) {
    const [mode, setMode] = useState(() => deriveInitialMode(value));

    const handleModeChange = (e) => {
        const next = e.target.value;
        setMode(next);
        if (next === 'none') onChange?.(null);
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
            <Radio.Group value={mode} onChange={handleModeChange} disabled={disabled} optionType="button" buttonStyle="solid" size="small">
                <Radio.Button value="none">Sin zoom</Radio.Button>
                <Radio.Button value="view">Vista del mapa</Radio.Button>
            </Radio.Group>

            {mode === 'none' && (
                <Alert closable={false} type="info" showIcon
                    message="Sin zoom"
                    description="El visor abrirá el evento sin hacer zoom a un área específica."
                />
            )}

            {mode === 'view' && (
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                    <MapPicker value={value} onChange={onChange} disabled={disabled} />
                    <Collapse ghost size="small" items={[{
                        key: 'manual',
                        label: (
                            <Space size={6}>
                                <Text style={{ fontSize: 13 }}>Ajustar coordenadas exactas</Text>
                                {isCompleteBbox(value) && <Tag color="blue" style={{ marginRight: 0 }}>bbox cargado</Tag>}
                            </Space>
                        ),
                        children: <ManualInputs value={value} onChange={onChange} disabled={disabled} />,
                    }]} />
                </Space>
            )}
        </Space>
    );
}
