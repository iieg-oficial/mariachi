import { useEffect, useMemo, useState } from 'react';
import { Button, Segmented, Space, Tooltip, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import InfoBoxPreview from './InfoBoxPreview';
import { referencedFields } from '@shared/infoboxPlan';
import { useSampleFeatures } from './sampleFeaturesContext';

const { Text } = Typography;

const camposVacios = (props, cfg) => {
    const faltan = [];
    referencedFields(cfg).forEach((campo) => {
        const v = props?.[campo];
        if (v === null || v === undefined || String(v).trim() === '') faltan.push(campo);
    });
    return faltan;
};

export default function InfoBoxPreviewPanel({ value, inherited = null, hasFeatureType = true }) {
    const { features } = useSampleFeatures();
    const [idx, setIdx] = useState(0);
    const [variant, setVariant] = useState('desktop');

    useEffect(() => { setIdx(0); }, [features]);

    const cfg = value || inherited?.config || null;
    const actual = features[idx] || null;
    const faltantes = useMemo(
        () => (actual && cfg ? camposVacios(actual.properties, cfg) : []),
        [actual, cfg],
    );

    const total = features.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <Text strong>Vista previa</Text>
                <Segmented
                    size="small"
                    value={variant}
                    onChange={setVariant}
                    options={[{ value: 'desktop', label: 'Escritorio' }, { value: 'mobile', label: 'Móvil' }]}
                />
            </div>

            {total > 0 && (
                <Space size={4} align="center">
                    <Button
                        size="small" type="text" icon={<LeftOutlined />}
                        aria-label="Registro anterior"
                        disabled={idx === 0}
                        onClick={() => setIdx((i) => Math.max(0, i - 1))}
                    />
                    <Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                        {idx + 1} / {total}
                    </Text>
                    <Button
                        size="small" type="text" icon={<RightOutlined />}
                        aria-label="Registro siguiente"
                        disabled={idx >= total - 1}
                        onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                    />
                    <Tooltip title="Registros reales de la capa. Recórrelos: la tarjeta se rompe en el que le falta un dato.">
                        <Text type="secondary" style={{ fontSize: 11 }}>registros reales</Text>
                    </Tooltip>
                </Space>
            )}

            <InfoBoxPreview value={value} properties={actual?.properties || null} variant={variant} />

            {faltantes.length > 0 && (
                <Text type="warning" style={{ fontSize: 11 }}>
                    Este registro no trae {faltantes.map((c) => <code key={c}>{c}</code>).reduce((a, b) => [a, ', ', b])}.
                </Text>
            )}
            {total === 0 && hasFeatureType && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Sin registros de ejemplo: se muestra con valores inventados.
                </Text>
            )}
        </div>
    );
}
