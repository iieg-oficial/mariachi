import { Modal, Typography, Tag, Alert, Divider } from 'antd';
import useIsMobile from '@hooks/useIsMobile';

const { Title, Text } = Typography;

export default function PublishChangesModal({
    visible,
    loading,
    newItems,
    modifiedItems,
    deletedItems,
    onCancel,
    onConfirm,
    isAdmin = true
}) {
    const { isMobile } = useIsMobile();
    return (
        <Modal
            title={isAdmin ? "Publicar cambios" : "Solicitar publicación"}
            open={visible}
            onCancel={onCancel}
            onOk={onConfirm}
            okText={isAdmin ? "Publicar" : "Solicitar aprobación"}
            cancelText="Cancelar"
            confirmLoading={loading}
            width={isMobile ? '100%' : 700}
            centered={isMobile}
        >
            <div>
                <Alert
                    title={isAdmin ? "Resumen de cambios" : "Solicitud de publicación"}
                    description={isAdmin
                        ? "Revisa cuidadosamente los cambios antes de publicar. Esta acción no se puede deshacer."
                        : "Tu solicitud será enviada a un administrador para su aprobación."}
                    type={isAdmin ? "warning" : "info"}
                    showIcon
                    style={{ marginBottom: 24 }}
                />

                {newItems.length > 0 && (
                    <>
                        <Title level={5}>
                            <Tag color="blue">NUEVOS</Tag> {newItems.length} item(s) nuevo(s)
                        </Title>
                        <ul style={{ marginBottom: 24 }}>
                            {newItems.map(item => (
                                <li key={item.id}>
                                    <Text strong>{item.label}</Text>
                                    <Text type="secondary"> - {item.url}</Text>
                                </li>
                            ))}
                        </ul>
                        <Divider />
                    </>
                )}

                {modifiedItems.length > 0 && (
                    <>
                        <Title level={5}>
                            <Tag color="orange">MODIFICADOS</Tag> {modifiedItems.length} item(s) modificado(s)
                        </Title>
                        <ul style={{ marginBottom: 24 }}>
                            {modifiedItems.map(item => (
                                <li key={item.id}>
                                    <Text strong>{item.label}</Text>
                                    <Text type="secondary"> - {item.url}</Text>
                                </li>
                            ))}
                        </ul>
                        <Divider />
                    </>
                )}

                {deletedItems.length > 0 && (
                    <>
                        <Title level={5}>
                            <Tag color="red">ELIMINADOS</Tag> {deletedItems.length} item(s) eliminado(s)
                        </Title>
                        <ul style={{ marginBottom: 24 }}>
                            {deletedItems.map(item => (
                                <li key={item.id}>
                                    <Text delete strong>{item.label}</Text>
                                    <Text type="secondary"> - {item.url}</Text>
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                {newItems.length === 0 && modifiedItems.length === 0 && deletedItems.length === 0 && (
                    <Text type="secondary">No hay cambios para publicar.</Text>
                )}
            </div>
        </Modal>
    );
}
