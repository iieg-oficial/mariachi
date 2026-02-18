import { Typography, Space, Button, Badge, Tag } from 'antd';
import { SaveOutlined, UndoOutlined, ExclamationCircleOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function MenuHeader({
    hasChanges,
    changesCount,
    publishing,
    isAdmin,
    reviewMode,
    reviewAuthor,
    borradorEstado,
    onDiscard,
    onPublish,
    onPreview,
    onRechazar
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Title level={2} style={{ margin: 0 }}>
                    {reviewMode ? `Revisando menú de ${reviewAuthor?.name || '...'}` : 'Gestión de Menú'}
                </Title>
                {hasChanges && !reviewMode && (
                    <Badge count={changesCount} overflowCount={99}>
                        <Tag color="orange" style={{ padding: '4px 12px', fontSize: 14 }}>
                            <ExclamationCircleOutlined /> Cambios sin publicar
                        </Tag>
                    </Badge>
                )}
                {!isAdmin && borradorEstado === 'pendiente_revision' && (
                    <Tag color="orange" style={{ padding: '4px 12px', fontSize: 14 }}>En revisión</Tag>
                )}
                {!isAdmin && borradorEstado === 'rechazado' && (
                    <Tag color="red" style={{ padding: '4px 12px', fontSize: 14 }}>Rechazado</Tag>
                )}
            </div>
            <Space>
                <Button icon={<EyeOutlined />} onClick={onPreview}>
                    Vista previa
                </Button>

                {reviewMode && isAdmin && (
                    <>
                        <Button danger onClick={onRechazar}>Rechazar</Button>
                        <Button type="primary" icon={<SaveOutlined />} loading={publishing} onClick={onPublish}>
                            Publicar borrador
                        </Button>
                    </>
                )}

                {!reviewMode && isAdmin && hasChanges && (
                    <>
                        <Button icon={<UndoOutlined />} onClick={onDiscard}>Descartar cambios</Button>
                        <Button type="primary" icon={<SaveOutlined />} loading={publishing} onClick={onPublish}>
                            Publicar cambios
                        </Button>
                    </>
                )}

                {!reviewMode && !isAdmin && hasChanges && borradorEstado !== 'pendiente_revision' && (
                    <>
                        <Button danger onClick={onDiscard}>Descartar</Button>
                        <Button type="primary" icon={<SendOutlined />} loading={publishing} onClick={onPublish}>
                            Enviar a revisión
                        </Button>
                    </>
                )}
            </Space>
        </div>
    );
}
