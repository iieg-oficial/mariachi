import { useState, useEffect } from 'react';
import { Modal, Input, message, Alert, Row, Col, Card, Button, Typography, Collapse, Tooltip } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { BLOCK_CONFIG, BLOCK_CATEGORIES, BLOCK_TYPES, getBlocksByCategory } from '@constants/pageConstants';
import useIsMobile from '@hooks/useIsMobile';

const { TextArea } = Input;
const { Text, Title } = Typography;

export default function JsonEditorModal({ visible, onClose, initialData, onSave }) {
    const { isMobile } = useIsMobile();
    const [jsonString, setJsonString] = useState('');
    const [error, setError] = useState(null);
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        if (visible && initialData) {
            setJsonString(JSON.stringify(initialData, null, 2));
            setError(null);
        }
    }, [visible, initialData]);

    const handleSave = () => {
        try {
            const parsedData = JSON.parse(jsonString);
            onSave(parsedData);
            onClose();
        } catch (err) {
            setError('JSON inválido: ' + err.message);
        }
    };

    const copySnippet = (type) => {
        const config = BLOCK_CONFIG[type];
        const snippet = {
            id: Date.now().toString(),  
            type: type,
            props: config.defaultProps || {}
        };
        const snippetString = JSON.stringify(snippet, null, 2);
        navigator.clipboard.writeText(snippetString);
        messageApi.success(`Plantilla de ${config.label} copiada al portapapeles`);
    };

    const renderSnippetList = () => {
        const categories = {
            [BLOCK_CATEGORIES.HOME]: 'Home Page',
            [BLOCK_CATEGORIES.BASIC]: 'Básicos',
            [BLOCK_CATEGORIES.LAYOUT]: 'Estructura',
            [BLOCK_CATEGORIES.MEDIA]: 'Multimedia',
            [BLOCK_CATEGORIES.DATA]: 'Datos',
        };

        const items = Object.entries(categories).map(([catKey, catLabel]) => {
            const blocks = getBlocksByCategory(catKey);
            if (blocks.length === 0) return null;

            return {
                key: catKey,
                label: catLabel,
                children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {blocks.map(block => (
                            <div key={block.type} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px',
                                border: '1px solid #f0f0f0',
                                borderRadius: '4px',
                                background: '#fafafa'
                            }}>
                                <span style={{ fontSize: 13 }}>{block.label}</span>
                                <Tooltip title="Copiar bloque JSON">
                                    <Button
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={() => copySnippet(block.type)}
                                    />
                                </Tooltip>
                            </div>
                        ))}
                    </div>
                )
            };
        }).filter(Boolean);

        return (
            <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: 10 }}>
                <Title level={5}>Plantillas de Bloques</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 10 }}>
                    Haz clic en copiar para obtener el JSON y pegarlo en el editor.
                </Text>

                <Collapse defaultActiveKey={['home']} accordion items={items} />
            </div>
        );
    };

    return (
        <Modal
            title="Editor Avanzado (JSON)"
            open={visible}
            onCancel={onClose}
            onOk={handleSave}
            width={isMobile ? '100%' : 1000}
            okText="Aplicar Cambios"
            cancelText="Cancelar"
            style={{ top: isMobile ? 0 : 20 }}
            centered={isMobile}
        >
            {contextHolder}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={16}>
                    <Alert
                        title="Zona de Peligro"
                        description="Editar el JSON directamente puede romper la página. Asegúrate de mantener la estructura correcta."
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                    {error && <Alert title={error} type="error" showIcon style={{ marginBottom: 16 }} />}
                    <TextArea
                        value={jsonString}
                        onChange={(e) => {
                            setJsonString(e.target.value);
                            setError(null);
                        }}
                        rows={isMobile ? 14 : 25}
                        style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
                    />
                </Col>
                <Col xs={24} md={8}>
                    {renderSnippetList()}
                </Col>
            </Row>
        </Modal>
    );
}
