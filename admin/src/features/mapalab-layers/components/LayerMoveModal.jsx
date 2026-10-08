import { useEffect, useMemo, useState } from 'react';
import { Modal, Space, Tooltip, TreeSelect, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { buildMoveTreeData } from '@features/mapalab-layers/utils/treeSelect';
import { findPath } from '@features/mapalab-layers/utils/treeSearch';

const { Text } = Typography;

const RAIZ = 'Raíz del árbol';

const rutaDe = (treeData, key) => {
    if (!key) return RAIZ;
    const path = findPath(treeData, key);
    return path ? path.map((n) => n.title).join(' › ') : RAIZ;
};

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

    const rutaActual = useMemo(() => rutaDe(treeData, currentParentId), [treeData, currentParentId]);
    const rutaDestino = useMemo(() => rutaDe(treeData, destino), [treeData, destino]);

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
            okText="Mover aquí"
            okButtonProps={{ disabled: sinCambio, loading: saving }}
            destroyOnClose
        >
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                <div>
                    <Text type="secondary" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Ahora cuelga de
                    </Text>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{rutaActual}</div>
                </div>

                <div>
                    <Text type="secondary" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Nuevo padre
                    </Text>
                    <TreeSelect
                        treeData={treeSelectData}
                        value={destino ?? undefined}
                        onChange={(v) => setDestino(v ?? null)}
                        placeholder={RAIZ}
                        allowClear
                        showSearch
                        treeLine
                        treeNodeFilterProp="title"
                        style={{ width: '100%', marginTop: 6 }}
                        styles={{ popup: { root: { maxHeight: 360, overflow: 'auto' } } }}
                    />
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                        Solo temas, categorías y grupos pueden ser padre. Vacío lo manda a la raíz.
                    </Text>
                </div>

                {!sinCambio && (
                    <div
                        style={{
                            background: '#f4f6fa',
                            border: '1px solid #e2e6ee',
                            borderRadius: 8,
                            padding: '10px 12px',
                        }}
                    >
                        <Space size={8} align="start">
                            <ArrowRightOutlined style={{ color: '#7385ab', marginTop: 3 }} />
                            <div>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Quedará como</Text>
                                <Tooltip title="Entra al final de la lista del destino. Después puedes arrastrarla para acomodarla entre sus hermanas.">
                                    <span style={{ fontSize: 13, cursor: 'help' }}>
                                        {rutaDestino} › <b>{layerLabel || layerId}</b>
                                    </span>
                                </Tooltip>
                            </div>
                        </Space>
                    </div>
                )}
            </Space>
        </Modal>
    );
}
