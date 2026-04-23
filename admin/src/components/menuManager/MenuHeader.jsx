import { Typography, Space, Button, Badge, Tag } from 'antd';
import { SaveOutlined, UndoOutlined, ExclamationCircleOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import useIsMobile from '@hooks/useIsMobile';

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
    const { isMobile } = useIsMobile();

    return (
        <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
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
            <Space
                wrap
                size={[8, 8]}
                style={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'stretch' : 'flex-end' }}
            >
                <Button icon={<EyeOutlined />} onClick={onPreview} block={isMobile}>
                    Vista previa
                </Button>

                {reviewMode && isAdmin && (
                    <>
                        <Button danger onClick={onRechazar} block={isMobile}>Rechazar</Button>
                        <Button type="primary" icon={<SaveOutlined />} loading={publishing} onClick={onPublish} block={isMobile}>
                            Publicar borrador
                        </Button>
                    </>
                )}

                {!reviewMode && isAdmin && hasChanges && (
                    <>
                        <Button icon={<UndoOutlined />} onClick={onDiscard} block={isMobile}>Descartar cambios</Button>
                        <Button type="primary" icon={<SaveOutlined />} loading={publishing} onClick={onPublish} block={isMobile}>
                            Publicar cambios
                        </Button>
                    </>
                )}

                {!reviewMode && !isAdmin && hasChanges && borradorEstado !== 'pendiente_revision' && (
                    <>
                        <Button danger onClick={onDiscard} block={isMobile}>Descartar</Button>
                        <Button type="primary" icon={<SendOutlined />} loading={publishing} onClick={onPublish} block={isMobile}>
                            Enviar a revisión
                        </Button>
                    </>
                )}
            </Space>
        </div>
    );
}
