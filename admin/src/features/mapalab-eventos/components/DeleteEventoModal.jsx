import { useEffect, useState } from 'react';
import { Alert, Checkbox, Modal, Spin, Tag, Typography } from 'antd';
import { previewOrphanLayers } from '../api/eventosService';

const { Text } = Typography;

export default function DeleteEventoModal({ open, evento, onCancel, onConfirm, loading }) {
    const [orphans, setOrphans] = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [deleteOrphans, setDeleteOrphans] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    useEffect(() => {
        if (!open || !evento?.id) {
            setOrphans([]);
            setDeleteOrphans(false);
            setPreviewError(null);
            return;
        }
        setPreviewLoading(true);
        setPreviewError(null);
        previewOrphanLayers(evento.id)
            .then((data) => setOrphans(Array.isArray(data) ? data : []))
            .catch((err) => setPreviewError(err?.response?.data?.detail || 'No se pudo cargar el listado de capas huérfanas'))
            .finally(() => setPreviewLoading(false));
    }, [open, evento?.id]);

    return (
        <Modal
            open={open}
            title="Eliminar evento"
            okText="Eliminar"
            okButtonProps={{ danger: true, loading }}
            cancelText="Cancelar"
            onCancel={onCancel}
            onOk={() => onConfirm({ deleteOrphanLayers: deleteOrphans })}
            destroyOnHidden
        >
            <p>
                ¿Eliminar el evento <Text strong>{evento?.titulo}</Text>? Esta acción no se puede deshacer.
            </p>
            {previewLoading ? (
                <Spin />
            ) : previewError ? (
                <Alert type="warning" showIcon title={previewError} />
            ) : orphans.length === 0 ? (
                <Alert
                    type="info"
                    showIcon
                    title="Este evento no tiene capas auto-creadas exclusivas."
                    description="Cualquier capa que use es del catálogo o también la usan otros eventos."
                />
            ) : (
                <>
                    <Alert
                        type="warning"
                        showIcon
                        title={`${orphans.length} capa(s) auto-creada(s) solo se usan en este evento.`}
                        description="Si nadie las necesita, puedes archivarlas también para no dejar filas huérfanas en el árbol. Esto no toca GeoServer; las capas siguen disponibles allí."
                        style={{ marginTop: 12 }}
                    />
                    <ul style={{ marginTop: 8, marginBottom: 12, paddingLeft: 20 }}>
                        {orphans.map((o) => (
                            <li key={o.id} style={{ marginBottom: 4 }}>
                                <Tag color="blue" style={{ marginRight: 4 }}>{o.workspace}:{o.layer}</Tag>
                                <Text type="secondary">{o.label}</Text>
                            </li>
                        ))}
                    </ul>
                    <Checkbox
                        checked={deleteOrphans}
                        onChange={(e) => setDeleteOrphans(e.target.checked)}
                    >
                        Archivar también estas capas auto-creadas
                    </Checkbox>
                </>
            )}
        </Modal>
    );
}
