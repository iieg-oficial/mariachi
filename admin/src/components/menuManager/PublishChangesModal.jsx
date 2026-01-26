import { Modal, Typography, Tag, Alert, Divider } from 'antd';

const { Title, Text } = Typography;

export default function PublishChangesModal({
    visible,
    loading,
    newItems,
    modifiedItems,
    deletedItems,
    onCancel,
    onConfirm
}) {
    return (
        <Modal
            title="Publicar cambios"
            open={visible}
            onCancel={onCancel}
            onOk={onConfirm}
            okText="Publicar"
            cancelText="Cancelar"
            confirmLoading={loading}
            width={700}
        >
            <div>
                <Alert
                    message="Resumen de cambios"
                    description="Revisa cuidadosamente los cambios antes de publicar. Esta acción no se puede deshacer."
                    type="warning"
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
