import { useState } from 'react';
import { Alert, Button, Spin, Tooltip, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

const API_BASE = import.meta.env.VITE_ADMIN_API_URL || '';

export default function LegendPreview({ workspace, styleName, layerName }) {
    const [version, setVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    if (!styleName || !layerName || !workspace) {
        return (
            <Alert closable
                type="info"
                showIcon
                title="Selecciona un estilo y una capa para ver la leyenda."
            />
        );
    }

    const url = `${API_BASE}/geoserver/legend/${encodeURIComponent(workspace)}/${encodeURIComponent(layerName)}/${encodeURIComponent(styleName)}?width=20&height=20&t=${version}`;

    const refresh = () => {
        setVersion((v) => v + 1);
        setLoading(true);
        setError(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong>Vista previa (live de GeoServer)</Text>
                <Tooltip title="Refrescar leyenda">
                    <Button size="small" icon={<ReloadOutlined />} onClick={refresh} />
                </Tooltip>
            </div>
            <div style={{ minHeight: 80, padding: 12, border: '1px solid #f0f0f0', borderRadius: 4, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loading && !error && <Spin size="small" />}
                {error && (
                    <Text type="danger" style={{ fontSize: 12 }}>
                        No se pudo cargar la leyenda. ¿Estilo correcto en GeoServer?
                    </Text>
                )}
                <img
                    src={url}
                    alt={`Leyenda de ${styleName}`}
                    style={{ maxWidth: '100%', display: error ? 'none' : 'block' }}
                    onLoad={() => setLoading(false)}
                    onError={() => { setError(true); setLoading(false); }}
                />
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
                La preview pega contra GeoServer (no contra el borrador). Refresca tras aprobar el borrador para ver los cambios.
            </Text>
        </div>
    );
}
