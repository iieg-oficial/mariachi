import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Empty, Modal, Space, Tag, Tooltip, Typography } from 'antd';
import { describeValue, labelOf, sectionOf } from '@features/mapalab-layers/utils/layerDiff';

const { Text } = Typography;

const buildRows = (drafts, published) => {
    const rows = [];
    for (const draft of drafts) {
        const data = draft.data || {};
        const antes = published[draft.resource_id] || null;
        for (const field of Object.keys(data)) {
            if (field === 'action') continue;
            rows.push({
                id: `${draft.resource_id}::${field}`,
                layerId: draft.resource_id,
                draftId: draft.id,
                field,
                section: sectionOf(field),
                value: data[field],
                previous: antes ? antes[field] : undefined,
                hasPrevious: Boolean(antes),
            });
        }
    }
    return rows;
};

export default function PublishReviewModal({
    open,
    onClose,
    drafts = [],
    layerTitles = {},
    publishedValues = {},
    isAdmin,
    onPublish,
    onDiscard,
    publishing,
}) {
    const rows = useMemo(() => buildRows(drafts, publishedValues), [drafts, publishedValues]);
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        if (open) setSelected(rows.map((r) => r.id));
    }, [open, rows]);

    const grouped = useMemo(() => {
        const byLayer = new Map();
        for (const row of rows) {
            if (!byLayer.has(row.layerId)) byLayer.set(row.layerId, new Map());
            const bySection = byLayer.get(row.layerId);
            if (!bySection.has(row.section)) bySection.set(row.section, []);
            bySection.get(row.section).push(row);
        }
        return byLayer;
    }, [rows]);

    const toggle = (id) => setSelected((prev) => (
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));

    const publicar = () => onPublish(rows.filter((r) => selected.includes(r.id)));

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={rows.length === 0 ? 'Sin cambios sin publicar' : `Vas a publicar ${selected.length} de ${rows.length} cambios`}
            width={640}
            footer={rows.length === 0 ? [
                <Button key="cerrar" onClick={onClose}>Cerrar</Button>,
            ] : [
                <Tooltip key="descartar" title="Borra el borrador completo y deja las capas como están publicadas">
                    <Button danger type="text" disabled={publishing} onClick={onDiscard}>
                        Descartar todo
                    </Button>
                </Tooltip>,
                <Button key="cancelar" onClick={onClose}>Cancelar</Button>,
                <Tooltip key="publicar" title={isAdmin ? '' : 'Se enviará a revisión de una administradora'}>
                    <Button
                        type="primary"
                        loading={publishing}
                        disabled={selected.length === 0}
                        onClick={publicar}
                    >
                        {isAdmin ? `Publicar ${selected.length}` : `Enviar ${selected.length} a revisión`}
                    </Button>
                </Tooltip>,
            ]}
        >
            {rows.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Todo lo que has editado ya está publicado."
                />
            ) : (
                <Space orientation="vertical" size={18} style={{ width: '100%' }}>
                    {[...grouped.entries()].map(([layerId, bySection]) => (
                        <div key={layerId}>
                            <Text strong style={{ fontSize: 14 }}>{layerTitles[layerId] || layerId}</Text>
                            {[...bySection.entries()].map(([section, items]) => (
                                <div key={section} style={{ marginTop: 10 }}>
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase' }}
                                    >
                                        {section}
                                    </Text>
                                    {items.map((row) => (
                                        <div
                                            key={row.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '6px 0',
                                                borderBottom: '1px solid #f0f0f0',
                                            }}
                                        >
                                            <Checkbox
                                                checked={selected.includes(row.id)}
                                                onChange={() => toggle(row.id)}
                                            />
                                            <Text style={{ flex: 1, fontSize: 13 }}>{labelOf(row.field)}</Text>
                                            <Space size={6} style={{ maxWidth: 320, justifyContent: 'flex-end' }}>
                                                {row.hasPrevious ? (
                                                    <Text delete type="secondary" style={{ fontSize: 11 }}>
                                                        {describeValue(row.previous)}
                                                    </Text>
                                                ) : (
                                                    <Tooltip title="Esta capa no está abierta, así que no se cargó su valor publicado">
                                                        <Text type="secondary" style={{ fontSize: 11, cursor: 'help' }}>?</Text>
                                                    </Tooltip>
                                                )}
                                                <Text type="secondary" style={{ fontSize: 11 }}>→</Text>
                                                <Tag color="blue" style={{ marginInlineEnd: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {describeValue(row.value)}
                                                </Tag>
                                            </Space>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                </Space>
            )}
        </Modal>
    );
}
