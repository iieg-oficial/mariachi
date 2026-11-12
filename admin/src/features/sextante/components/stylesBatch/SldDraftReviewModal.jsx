import { useEffect, useMemo } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { clearPreviewCache } from '@features/sextante/hooks/useStylePreview';
import { draftToRow } from '@features/sextante/utils/stylesBatchTable';
import { Legend, MapImage } from './PreviewCard';

const { Text } = Typography;

export default function SldDraftReviewModal({ borrador, onClose, onAprobar, onRechazar, aprobando, width = 760 }) {
    const row = useMemo(() => draftToRow(borrador), [borrador]);
    useEffect(() => clearPreviewCache, []);
    const footer = onAprobar
        ? (
            <Space>
                <Button shape="round" danger onClick={() => onRechazar(borrador)}>Rechazar</Button>
                <Button type="primary" shape="round" loading={aprobando} onClick={() => onAprobar(borrador)}>
                    Aprobar y publicar
                </Button>
            </Space>
        )
        : null;

    return (
        <Modal open title={row.nombre} onCancel={onClose} footer={footer} width={width} destroyOnHidden>
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{borrador.resource_id}</Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                    <MapImage alias={row.alias} layerName={row.layer_name} row={null} caption="Hoy en el visor" />
                    <MapImage alias={row.alias} layerName={row.layer_name} row={row} caption="Este borrador" />
                </div>
                <Legend row={row} />
            </Space>
        </Modal>
    );
}
