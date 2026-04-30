import { Alert, Card, Input, Space, Typography } from 'antd';
import LegendPreview from './LegendPreview';

const { Text } = Typography;

const REASON_TIPS = {
    layergroup: 'Esta capa está configurada en GeoServer como Layer Group (varias capas combinadas en una sola entidad). El editor solo soporta SLDs de capas individuales — para modificar la simbología, edita el estilo de cada capa miembro por separado.',
    point: 'Este SLD usa PointSymbolizer (capas de puntos). El editor visual aún no soporta puntos.',
    line: 'Este SLD usa LineSymbolizer (capas de líneas). El editor visual aún no soporta líneas.',
    raster: 'Este SLD usa RasterSymbolizer. El editor visual aún no soporta rasters.',
    categorical: 'Este SLD usa filtros categóricos (no rangos). El editor visual aún no soporta categóricos.',
    unknown: 'Este SLD usa un patrón que el editor visual aún no soporta.',
};

const TITLE_FOR_KIND = {
    layergroup: 'Esta capa es un Layer Group de GeoServer',
    point: 'Capa de puntos',
    line: 'Capa de líneas',
    raster: 'Capa raster',
    categorical: 'Simbología categórica',
    unknown: 'Tipo de SLD no soportado',
};

function countNamedLayers(xml) {
    const matches = xml.match(/<(?:sld:)?NamedLayer[\s>]/gi);
    return matches ? matches.length : 0;
}

function inferKind(reason = '', rawXml = '') {
    const xml = rawXml.toLowerCase();
    if (countNamedLayers(rawXml) > 1) return 'layergroup';
    if (xml.includes('rastersymbolizer')) return 'raster';
    if (xml.includes('pointsymbolizer') || xml.includes('linesymbolizer')) {
        if (xml.includes('linesymbolizer')) return 'line';
        return 'point';
    }
    if (reason.toLowerCase().includes('rango ni null')) return 'categorical';
    return 'unknown';
}

export default function RawXmlFallback({ rawXml, reason, workspace, styleName, layerName }) {
    const kind = inferKind(reason, rawXml);
    const tip = REASON_TIPS[kind];

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
                type="info"
                showIcon
                closable
                message={TITLE_FOR_KIND[kind] || 'Este tipo de SLD aún no es editable visualmente'}
                description={
                    <div>
                        <p style={{ marginBottom: 4 }}>{tip}</p>
                        <p style={{ marginBottom: 4 }}>
                            Por ahora puedes:
                        </p>
                        <ul style={{ marginTop: 0, marginBottom: 8, paddingLeft: 20 }}>
                            <li>Ver la leyenda actual abajo (renderizada por GeoServer).</li>
                            <li>Si necesitas modificarlo, edítalo directamente en GeoServer Web Admin o pide apoyo al equipo de geografía.</li>
                        </ul>
                        <details>
                            <summary style={{ cursor: 'pointer' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Detalle técnico</Text>
                            </summary>
                            <Text code style={{ fontSize: 11 }}>{reason || 'shape no reconocido'}</Text>
                        </details>
                    </div>
                }
            />

            {workspace && styleName && layerName && (
                <Card size="small" title="Leyenda actual">
                    <LegendPreview
                        workspace={workspace}
                        styleName={styleName}
                        layerName={layerName}
                    />
                </Card>
            )}

            <Card size="small" title="SLD (XML, solo lectura)">
                <Input.TextArea
                    value={rawXml}
                    rows={20}
                    readOnly
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
            </Card>
        </Space>
    );
}
