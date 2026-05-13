import { Alert, Button, Modal, Space, Tag, Typography } from 'antd';
import { CopyOutlined, WarningOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

export default function ApiKeyRevealModal({ keyData, onClose, onCopy }) {
    return (
        <Modal
            open={Boolean(keyData)}
            onCancel={onClose}
            onOk={onClose}
            okText="Entendido, ya la copié"
            cancelButtonProps={{ style: { display: 'none' } }}
            title={
                <Space>
                    <WarningOutlined style={{ color: '#faad14' }} />
                    <span>Nueva API key generada</span>
                </Space>
            }
            width={560}
            maskClosable={false}
        >
            {keyData && (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Alert
                        type="warning"
                        showIcon
                        message="Esta clave NO se mostrará otra vez."
                        description="Cópiala ahora y guárdala en un lugar seguro. Si la pierdes, tendrás que rotarla y actualizar todos los huéspedes."
                    />
                    <div>
                        <Text strong>Source app:</Text>{' '}
                        <Text>{keyData.sourceApp?.nombre} ({keyData.sourceApp?.slug})</Text>
                    </div>
                    <div>
                        <Text strong>Visibilidad:</Text>{' '}
                        <Tag color={keyData.visibility === 'public' ? 'blue' : 'red'}>
                            {keyData.visibility === 'public' ? 'Pública (browser)' : 'Privada (server)'}
                        </Tag>
                    </div>
                    <div>
                        <Text strong>API key:</Text>
                        <Paragraph
                            copyable={{ text: keyData.plainKey, tooltips: 'Copiar key' }}
                            style={{
                                background: '#f5f5f5',
                                padding: 12,
                                borderRadius: 6,
                                fontFamily: 'monospace',
                                fontSize: 13,
                                wordBreak: 'break-all',
                                marginTop: 8,
                                marginBottom: 0,
                            }}
                        >
                            {keyData.plainKey}
                        </Paragraph>
                    </div>
                    <Button
                        type="primary"
                        icon={<CopyOutlined />}
                        block
                        onClick={() => onCopy(keyData.plainKey)}
                    >
                        Copiar API key
                    </Button>
                </Space>
            )}
        </Modal>
    );
}
