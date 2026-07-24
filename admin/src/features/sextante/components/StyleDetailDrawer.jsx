import { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Descriptions,
    Drawer,
    Space,
    Spin,
    Tag,
    Typography,
} from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import LegendPreview from '@features/mapalab-layers/components/sldEditor/LegendPreview';
import { getStyleDetail } from '@features/sextante/api/sextanteService';
import { message } from '@shared/services/message';

const { Text, Paragraph } = Typography;

const SHAPE_LABELS = {
    choropleth: { label: 'Coroplético', color: 'purple' },
    boundary: { label: 'Límite / relleno único', color: 'blue' },
    point: { label: 'Punto', color: 'green' },
};

export default function StyleDetailDrawer({ open, alias, styleName, onClose }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open || !alias || !styleName) return;
        let active = true;
        setLoading(true);
        setError(null);
        setDetail(null);
        getStyleDetail(alias, styleName)
            .then((data) => { if (active) setDetail(data); })
            .catch((err) => {
                if (active) setError(err?.response?.data?.detail || 'No se pudo cargar el estilo');
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [open, alias, styleName]);

    const copyXml = async () => {
        try {
            await navigator.clipboard.writeText(detail.rawXml);
            message.success('SLD copiado');
        } catch {
            message.error('No se pudo copiar');
        }
    };

    const shape = detail?.shape ? SHAPE_LABELS[detail.shape] : null;
    const layerForLegend = detail?.sharedBy?.[0];

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={styleName}
            width={640}
            styles={{ wrapper: { maxWidth: '100vw' } }}
        >
            {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>}
            {error && <Alert type="error" showIcon message={error} />}
            {detail && (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="Workspace">
                            <Text code>{detail.workspace}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ámbito">
                            {detail.isGlobal
                                ? <Tag color="gold">Catálogo global</Tag>
                                : <Tag>Del workspace</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tipo detectado">
                            {shape
                                ? <Tag color={shape.color}>{shape.label}</Tag>
                                : <Tag color="default">No reconocido por el editor visual</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Editable desde Mariachi">
                            {detail.editable
                                ? <Tag color="green">Sí</Tag>
                                : <Tag color="orange">No</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Capas que lo usan">
                            {detail.sharedBy?.length
                                ? (
                                    <Space size={[4, 4]} wrap>
                                        {detail.sharedBy.map((name) => <Tag key={name}>{name}</Tag>)}
                                    </Space>
                                )
                                : <Text type="secondary">Ninguna capa de este workspace</Text>}
                        </Descriptions.Item>
                    </Descriptions>

                    {!detail.editable && detail.reason && (
                        <Alert type="info" showIcon closable message={detail.reason} />
                    )}

                    {detail.sharedBy?.length > 1 && (
                        <Alert
                            type="warning"
                            showIcon
                            closable
                            message={`Este estilo lo comparten ${detail.sharedBy.length} capas: editarlo las afecta a todas.`}
                        />
                    )}

                    <LegendPreview
                        workspace={detail.workspace}
                        styleName={detail.styleName}
                        layerName={layerForLegend}
                    />

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text strong>SLD</Text>
                            <Button size="small" icon={<CopyOutlined />} onClick={copyXml}>Copiar</Button>
                        </div>
                        <Paragraph>
                            <pre
                                style={{
                                    margin: 0,
                                    maxHeight: 320,
                                    overflow: 'auto',
                                    background: '#fafafa',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 4,
                                    padding: 12,
                                    fontSize: 11,
                                }}
                            >
                                {detail.rawXml}
                            </pre>
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            La edición visual del SLD vive en la pestaña Simbología de cada capa, con flujo de revisión.
                        </Text>
                    </div>
                </Space>
            )}
        </Drawer>
    );
}
