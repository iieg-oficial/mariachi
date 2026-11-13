import { useCallback, useEffect, useState } from 'react';
import { Button, Descriptions, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { BgColorsOutlined, CodeOutlined, CopyOutlined } from '@ant-design/icons';
import LegendPreview from '@features/mapalab-layers/components/sldEditor/LegendPreview';
import { getStyleDetail } from '@features/sextante/api/sextanteService';
import { rowsFromStyle } from '@features/sextante/api/stylesBatchService';
import DraftEditor from '@features/sextante/components/stylesBatch/DraftEditor';
import IconAction from '@features/sextante/components/stylesBatch/IconAction';
import XmlEditor from '@features/sextante/components/stylesBatch/XmlEditor';
import { message } from '@shared/services/message';
import StyleMapPreview from '@features/sextante/components/StyleMapPreview';

const { Text } = Typography;

const SHAPE_LABELS = {
    choropleth: { label: 'Coroplético', color: 'purple' },
    boundary: { label: 'Límite / relleno único', color: 'blue' },
    point: { label: 'Punto', color: 'green' },
};

const PRE_STYLE = {
    margin: 0,
    maxHeight: 360,
    overflow: 'auto',
    background: 'var(--ant-color-fill-quaternary)',
    borderRadius: 8,
    padding: 12,
    fontSize: 11,
};

export default function StyleDetail({ alias, styleName, canEdit }) {
    const [result, setResult] = useState({ key: null, detail: null, error: null });
    const [mode, setMode] = useState(null);
    const key = `${alias}:${styleName}`;
    const loadRows = useCallback(() => rowsFromStyle(alias, styleName), [alias, styleName]);

    useEffect(() => {
        let active = true;
        getStyleDetail(alias, styleName)
            .then((detail) => { if (active) setResult({ key, detail, error: null }); })
            .catch((err) => {
                if (active) setResult({ key, detail: null, error: err?.response?.data?.detail || 'No se pudo cargar el estilo' });
            });
        return () => { active = false; };
    }, [alias, styleName, key]);

    if (result.key !== key) return <Spin />;
    if (result.error) return <Text type="danger">{result.error}</Text>;

    const { detail } = result;
    const shape = SHAPE_LABELS[detail.shape];

    const copyXml = async () => {
        try {
            await navigator.clipboard.writeText(detail.rawXml);
            message.success('SLD copiado');
        } catch {
            message.error('No se pudo copiar');
        }
    };

    const toggle = (next) => setMode((prev) => (prev === next ? null : next));
    const canEditColors = canEdit && detail.editable && detail.shape === 'choropleth';
    const canEditXml = canEdit && !detail.isGlobal;

    const modes = (canEditColors || canEditXml) && (
        <Space size={6} style={{ width: '100%', justifyContent: 'flex-end' }}>
            {canEditColors && (
                <IconAction title="Editar colores y cortes" icon={<BgColorsOutlined />} active={mode === 'colores'} onClick={() => toggle('colores')} />
            )}
            {canEditXml && (
                <IconAction title="Editar el XML" icon={<CodeOutlined />} active={mode === 'xml'} onClick={() => toggle('xml')} />
            )}
        </Space>
    );

    if (mode === 'colores') {
        return (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                {modes}
                <DraftEditor
                    load={loadRows}
                    savedText="Borrador guardado en Sin publicar"
                    onSaved={() => setMode(null)}
                    onCancel={() => setMode(null)}
                />
            </Space>
        );
    }

    if (mode === 'xml') {
        return (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                {modes}
                <XmlEditor
                    alias={alias}
                    style={detail.styleName}
                    layerName={detail.sharedBy?.[0]}
                    initial={detail.rawXml}
                    onSaved={() => setMode(null)}
                    onCancel={() => setMode(null)}
                />
            </Space>
        );
    }

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {modes}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label="Tipo">
                            {shape ? <Tag color={shape.color}>{shape.label}</Tag> : <Tag>No reconocido</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Editable">
                            {detail.editable ? <Tag color="green">Sí</Tag> : <Tag color="orange">No</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Capas que lo usan">
                            {detail.sharedBy?.length
                                ? <Space size={[4, 4]} wrap>{detail.sharedBy.map((name) => <Tag key={name}>{name}</Tag>)}</Space>
                                : <Text type="secondary">Ninguna</Text>}
                        </Descriptions.Item>
                    </Descriptions>
                    {!detail.editable && detail.reason && <Text type="secondary">{detail.reason}</Text>}
                    {detail.sharedBy?.length > 1 && (
                        <Text type="warning">Lo comparten {detail.sharedBy.length} capas: editarlo las cambia a todas.</Text>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'start' }}>
                        <StyleMapPreview alias={alias} layers={detail.sharedBy} xml={detail.rawXml} />
                        <LegendPreview workspace={detail.workspace} styleName={detail.styleName} layerName={detail.sharedBy?.[0]} />
                    </div>
                </Space>
                <Space orientation="vertical" size={8} style={{ width: '100%', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text strong>SLD</Text>
                        <Tooltip title="Copiar SLD">
                            <Button shape="circle" size="small" icon={<CopyOutlined />} aria-label="Copiar SLD" onClick={copyXml} />
                        </Tooltip>
                    </div>
                    <pre style={PRE_STYLE}>{detail.rawXml}</pre>
                </Space>
            </div>
        </Space>
    );
}
