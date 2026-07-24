import { useState } from 'react';
import { Button, Input, Modal, Space, Typography } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';

const { Paragraph, Text } = Typography;
const { TextArea } = Input;


export default function SldSnippetModal({ open, file, onClose }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!file?.sldSnippet) return;
        try {
            await navigator.clipboard.writeText(file.sldSnippet);
            setCopied(true);
            message.success('Snippet copiado al portapapeles');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            message.error('No se pudo copiar. Selecciona el texto manualmente.');
        }
    };

    return (
        <Modal
            open={open}
            title={`Snippet SLD para ${file?.name || ''}`}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>Cerrar</Button>,
                <Button
                    key="copy"
                    type="primary"
                    icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={handleCopy}
                >
                    {copied ? 'Copiado' : 'Copiar snippet'}
                </Button>,
            ]}
            width={640}
            destroyOnHidden
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Pega esto dentro de un <Text code>{'<Rule>'}</Text> de tu SLD en GeoServer.
                    La referencia es relativa a <Text code>geoserver_data/styles/</Text>.
                </Paragraph>
                <TextArea
                    value={file?.sldSnippet || ''}
                    readOnly
                    autoSize={{ minRows: 4, maxRows: 8 }}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
            </Space>
        </Modal>
    );
}
