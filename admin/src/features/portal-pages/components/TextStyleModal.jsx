import { Modal, Form, Select, Space, Typography, Divider, Row, Col } from 'antd';
import { useFontConfig } from '@features/portal-pages/components/useFontConfig';
import { useState, useEffect } from 'react';

const { Text } = Typography;

const TextStyleModal = ({ visible, onCancel, onSave, initialValues, fieldLabel, previewText }) => {
    const { fontFamilies, getWeightsForFamily } = useFontConfig();
    const [form] = Form.useForm();
    const [selectedFamily, setSelectedFamily] = useState(initialValues?.font);
    const [selectedWeight, setSelectedWeight] = useState(initialValues?.weight);
    const [selectedColor, setSelectedColor] = useState(initialValues?.color || '#000000');

    useEffect(() => {
        if (visible) {
            form.setFieldsValue({
                font: initialValues?.font,
                weight: initialValues?.weight,
                color: initialValues?.color || '#000000'
            });
            setSelectedFamily(initialValues?.font);
            setSelectedWeight(initialValues?.weight);
            setSelectedColor(initialValues?.color || '#000000');
        }
    }, [visible, initialValues, form]);

    const handleFamilyChange = (family) => {
        setSelectedFamily(family);
        form.setFieldValue('font', family);

        const weights = getWeightsForFamily(family);
        if (weights.length > 0) {
            const defaultWeight = weights.find(w => w.weight === 400 && w.fontStyle === 'normal') || weights[0];
            setSelectedWeight(defaultWeight.value);
            form.setFieldValue('weight', defaultWeight.value);
        }
    };

    const handleWeightChange = (weight) => {
        setSelectedWeight(weight);
    };

    const handleColorChange = (e) => {
        setSelectedColor(e.target.value);
    };

    const handleSave = () => {
        form.validateFields().then(values => {
            onSave(values);
        });
    };

    const getPreviewStyle = () => {
        if (!selectedFamily) return {};

        let weight = 400;
        let fontStyle = 'normal';

        if (selectedWeight) {
            const [w, s] = selectedWeight.split('-');
            weight = parseInt(w);
            fontStyle = s;
        }

        return {
            fontFamily: `'${selectedFamily}', sans-serif`,
            fontWeight: weight,
            fontStyle: fontStyle !== 'normal' ? fontStyle : undefined,
            color: selectedColor,
            fontSize: 24,
            lineHeight: 1.5
        };
    };

    return (
        <Modal
            title={`Personalizar ${fieldLabel}`}
            open={visible}
            onCancel={onCancel}
            onOk={handleSave}
            okText="Aplicar"
            cancelText="Cancelar"
            width={600}
        >
            <Form form={form} layout="vertical">
                <Row gutter={16}>
                    <Col span={16}>
                        <Form.Item
                            label="Familia Tipográfica"
                            name="font"
                        >
                            <Select
                                placeholder="Selecciona una fuente"
                                onChange={handleFamilyChange}
                                showSearch
                                optionFilterProp="children"
                            >
                                <Select.Option value="">Sin fuente personalizada</Select.Option>
                                {fontFamilies.map(family => (
                                    <Select.Option key={family.family} value={family.family}>
                                        {family.family}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col span={8}>
                        <Form.Item
                            label="Color"
                            name="color"
                        >
                            <Space align="center">
                                <input
                                    type="color"
                                    value={selectedColor}
                                    onChange={handleColorChange}
                                    style={{
                                        width: 60,
                                        height: 38,
                                        border: '1px solid #d9d9d9',
                                        borderRadius: 6,
                                        cursor: 'pointer'
                                    }}
                                />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {selectedColor}
                                </Text>
                            </Space>
                        </Form.Item>
                    </Col>
                </Row>

                {selectedFamily && (
                    <Form.Item
                        label="Peso y Estilo"
                        name="weight"
                    >
                        <Select
                            placeholder="Selecciona peso"
                            onChange={handleWeightChange}
                            options={getWeightsForFamily(selectedFamily)}
                        />
                    </Form.Item>
                )}

                <Divider>Vista Previa</Divider>

                <div style={{
                    padding: 24,
                    background: '#fafafa',
                    borderRadius: 8,
                    border: '1px solid #e8e8e8',
                    minHeight: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={getPreviewStyle()}>
                        {previewText || fieldLabel}
                    </div>
                </div>
            </Form>
        </Modal>
    );
};

export default TextStyleModal;
