import { useState } from 'react';
import { Form, Input, Button, Space } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import TextStyleModal from './TextStyleModal';

const PersonalizedInput = ({
    label,
    name,
    fontName,
    fontWeightName,
    colorName,
    placeholder,
    previewText,
    form,
    required = false,
    ...inputProps
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    const openModal = () => {
        setModalVisible(true);
    };

    const handleSave = (values) => {
        form.setFieldValue(fontName, values.font);
        form.setFieldValue(fontWeightName, values.weight);
        form.setFieldValue(colorName, values.color);
        setModalVisible(false);
    };

    const initialValues = {
        font: form.getFieldValue(fontName),
        weight: form.getFieldValue(fontWeightName),
        color: form.getFieldValue(colorName)
    };

    return (
        <>
            <Form.Item label={label} required={required}>
                <Space.Compact style={{ width: '100%' }}>
                    <Form.Item
                        name={name}
                        noStyle
                        rules={required ? [{ required: true, message: `${label} es requerido` }] : []}
                    >
                        <Input
                            placeholder={placeholder}
                            {...inputProps}
                            style={{ flex: 1 }}
                        />
                    </Form.Item>
                    <Button
                        icon={<BgColorsOutlined />}
                        onClick={openModal}
                        title="Personalizar estilo"
                    >
                        Personalizar
                    </Button>
                </Space.Compact>
                <Form.Item name={fontName} hidden>
                    <Input />
                </Form.Item>
                <Form.Item name={fontWeightName} hidden>
                    <Input />
                </Form.Item>
                <Form.Item name={colorName} hidden>
                    <Input />
                </Form.Item>
            </Form.Item>

            <TextStyleModal
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onSave={handleSave}
                initialValues={initialValues}
                fieldLabel={label}
                previewText={previewText || form.getFieldValue(name)}
            />
        </>
    );
};

export default PersonalizedInput;
