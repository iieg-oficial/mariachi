import { useMemo, useState } from 'react';
import { Select, Space, Typography } from 'antd';
import { MapImage } from '@features/sextante/components/stylesBatch/PreviewCard';

const { Text } = Typography;

export default function StyleMapPreview({ alias, layers = [], xml }) {
    const [elegida, setElegida] = useState(null);
    const row = useMemo(() => ({ xml }), [xml]);
    const capa = layers.includes(elegida) ? elegida : layers[0];
    if (!capa || !xml) return null;
    return (
        <Space orientation="vertical" size={8} style={{ width: '100%', minWidth: 0 }}>
            <MapImage alias={alias} layerName={capa} row={row} />
            {layers.length > 1 && (
                <Space size={6} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>Pintado sobre</Text>
                    <Select
                        size="small"
                        value={capa}
                        onChange={setElegida}
                        options={layers.map((name) => ({ value: name, label: name }))}
                        style={{ minWidth: 200 }}
                        popupMatchSelectWidth={false}
                        aria-label="Capa sobre la que se pinta el estilo"
                    />
                </Space>
            )}
        </Space>
    );
}
