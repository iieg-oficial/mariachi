import { Modal, Form, Select, Button, Space, Empty } from 'antd';
import { FontSizeOutlined, PlusOutlined } from '@ant-design/icons';
import { useFontConfig } from '@contexts/FontConfigContext';
import { useState } from 'react';
import FontSelector from '@components/FontSelector';

const FontConfigModal = ({ visible, onCancel, onSave, initialFont, initialWeight, title }) => {
    const { fontFamilies, getWeightsForFamily } = useFontConfig();
    const [form] = Form.useForm();
    const [fontSelectorVisible, setFontSelectorVisible] = useState(false);
    const [selectedFamily, setSelectedFamily] = useState(initialFont);

    const handleFontSelect = (family) => {
        setSelectedFamily(family);
        form.setFieldValue('font', family);

        const weights = getWeightsForFamily(family);
        if (weights.length > 0) {
            const defaultWeight = weights.find(w => w.weight === 400 && w.fontStyle === 'normal') || weights[0];
            form.setFieldValue('weight', defaultWeight.value);
        }

        setFontSelectorVisible(false);
    };

    const handleSave = () => {
        form.validateFields().then(values => {
            onSave(values);
            onCancel();
        });
    };

    return (
        <>
            <Modal
                title={title || 'Configurar Fuente'}
                open={visible}
                onCancel={onCancel}
                footer={[
                    <Button key="cancel" onClick={onCancel}>
                        Cancelar
                    </Button>,
                    <Button key="save" type="primary" onClick={handleSave}>
                        Aplicar
                    </Button>
                ]}
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        font: initialFont,
                        weight: initialWeight
                    }}
                >
                    <Form.Item
                        label="Familia Tipográfica"
                        name="font"
                        rules={[{ required: true, message: 'Selecciona una fuente' }]}
                    >
                        <Space.Compact style={{ width: '100%' }}>
                            <Select
                                placeholder="Selecciona una familia"
                                style={{ width: '100%' }}
                                value={selectedFamily}
                                onChange={setSelectedFamily}
                            >
                                {fontFamilies.map(family => (
                                    <Select.Option key={family.family} value={family.family}>
                                        {family.family} ({family.variants.length} variantes)
                                    </Select.Option>
                                ))}
                            </Select>
                            <Button
                                icon={<PlusOutlined />}
                                onClick={() => setFontSelectorVisible(true)}
                                title="Explorar fuentes"
                            />
                        </Space.Compact>
                    </Form.Item>

                    {selectedFamily && (
                        <Form.Item
                            label="Peso y Estilo"
                            name="weight"
                            rules={[{ required: true, message: 'Selecciona un peso' }]}
                        >
                            <Select
                                placeholder="Selecciona peso y estilo"
                                options={getWeightsForFamily(selectedFamily)}
                            />
                        </Form.Item>
                    )}

                    {selectedFamily && (
                        <div style={{
                            padding: 16,
                            background: '#fafafa',
                            borderRadius: 4,
                            fontFamily: `'${selectedFamily}', sans-serif`,
                            fontSize: 20
                        }}>
                            <div style={{ marginBottom: 8, color: '#8c8c8c', fontSize: 12 }}>
                                Vista previa:
                            </div>
                            El veloz murciélago hindú comía feliz cardillo y kiwi
                        </div>
                    )}
                </Form>
            </Modal>

            <FontSelector
                visible={fontSelectorVisible}
                onCancel={() => setFontSelectorVisible(false)}
                onSelect={handleFontSelect}
                defaultFamily={selectedFamily}
                title="Explorar Fuentes"
            />
        </>
    );
};

export default FontConfigModal;
