import { Button, Card, Popconfirm, Space, Tag } from 'antd';
import {
    CheckCircleOutlined,
    CheckOutlined,
    CloseOutlined,
    CloudUploadOutlined,
    HistoryOutlined,
    SaveOutlined,
    SyncOutlined,
} from '@ant-design/icons';

const STATE_COLOR = {
    en_progreso: 'blue',
    pendiente_revision: 'orange',
    aprobado: 'green',
    rechazado: 'red',
};

export default function SldActionsCard({
    draft,
    reviewMode,
    borradorId,
    isAdmin,
    saving,
    submitting,
    publishing,
    approving,
    onSave,
    onSubmitReview,
    onPublicar,
    onAprobar,
    onRechazarOpen,
    onReload,
    onHistoryOpen,
}) {
    const draftBadge = draft ? (
        <Tag color={STATE_COLOR[draft.estado] || 'default'}>
            Borrador: {draft.estado}
        </Tag>
    ) : null;

    return (
        <Card size="small">
            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                {draftBadge}
                {reviewMode && borradorId ? (
                    <>
                        <Tag color="orange" style={{ width: '100%', textAlign: 'center', padding: 4 }}>
                            Modo revisión
                        </Tag>
                        <Button type="primary" icon={<CheckOutlined />} onClick={onAprobar} loading={approving} block>
                            Aprobar y aplicar
                        </Button>
                        <Button danger icon={<CloseOutlined />} onClick={onRechazarOpen} block>
                            Rechazar
                        </Button>
                        <Button icon={<SyncOutlined />} onClick={onReload} block>
                            Recargar
                        </Button>
                    </>
                ) : (
                    <>
                        <Button icon={<SaveOutlined />} onClick={onSave} loading={saving} block>
                            Guardar borrador
                        </Button>
                        {isAdmin ? (
                            <Popconfirm
                                title="Publicar SLD directo"
                                description="Se aplicará en GeoServer inmediatamente sin pasar por revisión."
                                okText="Publicar"
                                cancelText="Cancelar"
                                onConfirm={onPublicar}
                            >
                                <Button type="primary" icon={<CheckOutlined />} loading={publishing} block>
                                    Publicar directo (admin)
                                </Button>
                            </Popconfirm>
                        ) : (
                            <Button
                                type="primary"
                                icon={<CloudUploadOutlined />}
                                onClick={onSubmitReview}
                                loading={submitting}
                                block
                            >
                                Solicitar revisión
                            </Button>
                        )}
                        <Button icon={<SyncOutlined />} onClick={onReload} block>
                            Recargar de GeoServer
                        </Button>
                        {isAdmin && (
                            <Button icon={<HistoryOutlined />} onClick={onHistoryOpen} block>
                                Historial
                            </Button>
                        )}
                    </>
                )}
                {draft?.estado === 'aprobado' && (
                    <Tag icon={<CheckCircleOutlined />} color="success" style={{ width: '100%', textAlign: 'center', padding: 4 }}>
                        Aprobado y aplicado en GeoServer
                    </Tag>
                )}
            </Space>
        </Card>
    );
}
