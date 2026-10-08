import { Alert, Button, Modal, Space, Tag, Typography } from 'antd';
import { CopyOutlined, ExperimentOutlined, WarningOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';

const { Text, Paragraph } = Typography;


const buildSnippet = (apiKey) => {
    const layers = (apiKey.capasPermitidas && apiKey.capasPermitidas[0]) || 'recursos:cultivos';
    return [
        `<script src="https://mapalab.iieg.gob.mx/widget/v1/mapalab.js" defer></script>`,
        `<iieg-mapalab`,
        `    api-key="${apiKey.keyPrefix}…"`,
        `    layers="${layers}"`,
        `    height="500">`,
        `</iieg-mapalab>`,
    ].join('\n');
};


export default function ApiKeyRevealModal({ keyModal, onClose, onTryPlayground }) {
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(
            () => message.success('Copiado'),
            () => message.error('No se pudo copiar'),
        );
    };

    if (!keyModal) {
        return (
            <Modal
                open={false}
                onCancel={onClose}
                onOk={onClose}
                cancelButtonProps={{ style: { display: 'none' } }}
                title=""
            />
        );
    }

    const isPublic = keyModal.apiKey?.visibility === 'public';

    return (
        <Modal
            open
            onCancel={onClose}
            onOk={onClose}
            okText="Ya la guardé, continuar"
            cancelButtonProps={{ style: { display: 'none' } }}
            title={
                <Space>
                    <WarningOutlined style={{ color: '#faad14' }} />
                    <span>Contraseña de la llave</span>
                </Space>
            }
            width={620}
            maskClosable={false}
        >
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                    type="warning"
                    showIcon
                    title="Esta contraseña solo aparece una vez"
                    description="Cópiala ahora y guárdala en un lugar seguro o entrégala a la institución por un canal confiable. Si se pierde tendrás que generar una nueva. (Este aviso no se puede cerrar para evitar que se pierda la contraseña.)"
                />
                <div>
                    <Text strong>Institución:</Text>{' '}
                    <Text>{keyModal.apiKey?.institucionNombre}</Text>
                </div>
                <div>
                    <Text strong>Tipo de llave:</Text>{' '}
                    <Tag color={isPublic ? 'blue' : 'purple'}>
                        {isPublic ? 'Pública (para páginas web)' : 'Privada (para servidores)'}
                    </Tag>
                </div>
                <div>
                    <Text strong>Contraseña completa:</Text>
                    <Paragraph
                        copyable={{ text: keyModal.plainKey, tooltips: 'Copiar contraseña' }}
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
                        {keyModal.plainKey}
                    </Paragraph>
                </div>
                <Space style={{ width: '100%' }} wrap>
                    <Button
                        type="primary"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(keyModal.plainKey)}
                    >
                        Copiar contraseña
                    </Button>
                    {onTryPlayground && (
                        <Button
                            icon={<ExperimentOutlined />}
                            onClick={() => onTryPlayground(keyModal.apiKey, keyModal.plainKey)}
                        >
                            Probar la llave ahora
                        </Button>
                    )}
                </Space>
                {isPublic && (
                    <div>
                        <Text strong>Ejemplo de cómo se usa:</Text>
                        <Paragraph
                            copyable={{ text: buildSnippet(keyModal.apiKey), tooltips: 'Copiar ejemplo' }}
                            style={{
                                background: '#fafafa',
                                padding: 12,
                                borderRadius: 6,
                                fontFamily: 'monospace',
                                fontSize: 12,
                                whiteSpace: 'pre',
                                marginTop: 8,
                                marginBottom: 0,
                            }}
                        >
                            {buildSnippet(keyModal.apiKey)}
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Al copiar este ejemplo, reemplaza la parte de la contraseña por el valor completo que aparece arriba antes de entregarlo a la institución.
                        </Text>
                    </div>
                )}
            </Space>
        </Modal>
    );
}
