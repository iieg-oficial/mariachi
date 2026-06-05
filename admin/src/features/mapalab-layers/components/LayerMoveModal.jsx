import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Space, TreeSelect, Typography } from 'antd';
import { buildMoveTreeData } from '@features/mapalab-layers/utils/treeSelect';

const { Text } = Typography;

export default function LayerMoveModal({ open, onClose, onSubmit, treeData = [], layerId, layerLabel, currentParentId = null }) {
    const [destino, setDestino] = useState(currentParentId);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) setDestino(currentParentId ?? null);
    }, [open, currentParentId]);

    const treeSelectData = useMemo(
        () => buildMoveTreeData(treeData, layerId),
        [treeData, layerId],
    );

    const sinCambio = (destino ?? null) === (currentParentId ?? null);

    const handleOk = async () => {
        setSaving(true);
        try {
            await onSubmit(destino ?? null);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            title={`Mover "${layerLabel || layerId}"`}
            onCancel={onClose}
            onOk={handleOk}
            okText="Mover"
            okButtonProps={{ disabled: sinCambio, loading: saving }}
            destroyOnClose
        >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Text type="secondary">
                    Selecciona el tema o categoría destino. Déjalo vacío para enviarlo a la raíz del árbol.
                </Text>
                <TreeSelect
                    treeData={treeSelectData}
                    value={destino ?? undefined}
                    onChange={(v) => setDestino(v ?? null)}
                    placeholder="Sin padre (raíz)"
                    allowClear
                    showSearch
                    treeNodeFilterProp="title"
                    style={{ width: '100%' }}
                    styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
                />
                <Alert
                    type="info"
                    showIcon
                    message="La capa se colocará al final de la lista del destino. Después puedes reordenarla entre sus hermanas."
                />
            </Space>
        </Modal>
    );
}
