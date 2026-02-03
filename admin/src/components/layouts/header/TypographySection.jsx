import { useState } from 'react';
import { Form, Button, Space, Typography, Tag } from 'antd';
import { FontSizeOutlined, EditOutlined } from '@ant-design/icons';
import FontConfigModal from './FontConfigModal';

const { Text } = Typography;

const TypographySection = ({ form }) => {
    const [modalConfig, setModalConfig] = useState({ visible: false, field: null });

    const openFontModal = (field, title) => {
        setModalConfig({
            visible: true,
            field,
            title,
            initialFont: form.getFieldValue(field),
            initialWeight: form.getFieldValue(`${field}Weight`)
        });
    };

    const handleFontSave = (values) => {
        const { field } = modalConfig;
        form.setFieldValue(field, values.font);
        form.setFieldValue(`${field}Weight`, values.weight);
        setModalConfig({ visible: false, field: null });
    };

    const renderFontField = (field, label, previewText) => {
        const fontFamily = form.getFieldValue(field);
        const fontWeight = form.getFieldValue(`${field}Weight`);

        return (
            <Form.Item label={label}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Button
                        icon={<FontSizeOutlined />}
                        onClick={() => openFontModal(field, `Configurar ${label}`)}
                        block
                        type={fontFamily ? 'default' : 'dashed'}
                    >
                        {fontFamily ? `${fontFamily}` : `Seleccionar ${label}`}
                        {fontFamily && fontWeight && (
                            <Tag color="blue" style={{ marginLeft: 8 }}>
                                {fontWeight.split('-')[0]}
                            </Tag>
                        )}
                    </Button>

                    {fontFamily && (
                        <div style={{
                            padding: 12,
                            border: '1px solid #d9d9d9',
                            borderRadius: 4,
                            background: '#fafafa',
                            fontFamily: `'${fontFamily}', sans-serif`,
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8
                            }}>
                                <Text strong>Vista previa</Text>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => openFontModal(field, `Editar ${label}`)}
                                >
                                    Cambiar
                                </Button>
                            </div>
                            <div style={{ fontSize: 18 }}>
                                {previewText}
                            </div>
                        </div>
                    )}
                </Space>

                <Form.Item name={field} hidden>
                    <input />
                </Form.Item>
                <Form.Item name={`${field}Weight`} hidden>
                    <input />
                </Form.Item>
            </Form.Item>
        );
    };

    return (
        <>
            {renderFontField('titleFont', 'Fuente del Título', 'IIEG Jalisco')}
            {renderFontField('menuFont', 'Fuente del Menú', 'Inicio • Nosotros • Contacto')}

            <FontConfigModal
                visible={modalConfig.visible}
                onCancel={() => setModalConfig({ visible: false, field: null })}
                onSave={handleFontSave}
                initialFont={modalConfig.initialFont}
                initialWeight={modalConfig.initialWeight}
                title={modalConfig.title}
            />
        </>
    );
};

export default TypographySection;
