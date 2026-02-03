import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Space, Divider, Select } from 'antd';
import { SaveOutlined, UndoOutlined, FontSizeOutlined } from '@ant-design/icons';
import api from '@services/api';
import FontSelector from '@components/FontSelector';
import fontService from '@services/fontService';

const { TextArea } = Input;

const FooterLayoutForm = ({ initialData, onSaved }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fontSelectorVisible, setFontSelectorVisible] = useState(false);
    const [fontSelectorField, setFontSelectorField] = useState(null);
    const [selectedTextFont, setSelectedTextFont] = useState(null);
    const [selectedLinkFont, setSelectedLinkFont] = useState(null);
    const [fontFamilies, setFontFamilies] = useState([]);
    const [textFontWeights, setTextFontWeights] = useState([]);
    const [linkFontWeights, setLinkFontWeights] = useState([]);

    useEffect(() => {
        const loadFonts = async () => {
            try {
                const families = await fontService.getFontFamilies();
                setFontFamilies(families);
            } catch (error) {
                console.error('Error loading fonts:', error);
            }
        };
        loadFonts();
    }, []);

    useEffect(() => {
        if (selectedTextFont && fontFamilies.length > 0) {
            const family = fontFamilies.find(f => f.family === selectedTextFont);
            if (family) {
                const weights = family.variants.map((v, index) => ({
                    value: `${v.weight}-${v.style}`,
                    label: `${v.weight} - ${v.name} (${v.style})`,
                    weight: v.weight,
                    fontStyle: v.style
                }));
                setTextFontWeights(weights);
                if (!form.getFieldValue('textFontWeight')) {
                    const defaultWeight = weights.find(w => w.weight === 400 && w.fontStyle === 'normal') || weights[0];
                    form.setFieldValue('textFontWeight', defaultWeight?.value);
                }
            }
        } else {
            setTextFontWeights([]);
        }
    }, [selectedTextFont, fontFamilies, form]);

    useEffect(() => {
        if (selectedLinkFont && fontFamilies.length > 0) {
            const family = fontFamilies.find(f => f.family === selectedLinkFont);
            if (family) {
                const weights = family.variants.map((v, index) => ({
                    value: `${v.weight}-${v.style}`,
                    label: `${v.weight} - ${v.name} (${v.style})`,
                    weight: v.weight,
                    fontStyle: v.style
                }));
                setLinkFontWeights(weights);
                if (!form.getFieldValue('linkFontWeight')) {
                    const defaultWeight = weights.find(w => w.weight === 400 && w.fontStyle === 'normal') || weights[0];
                    form.setFieldValue('linkFontWeight', defaultWeight?.value);
                }
            }
        } else {
            setLinkFontWeights([]);
        }
    }, [selectedLinkFont, fontFamilies, form]);

    useEffect(() => {
        if (initialData) {
            form.setFieldsValue(initialData);
            if (initialData.textFont) {
                setSelectedTextFont(initialData.textFont);
            }
            if (initialData.linkFont) {
                setSelectedLinkFont(initialData.linkFont);
            }
        }
    }, [initialData, form]);

    const handleFontSelect = (family) => {
        if (fontSelectorField === 'textFont') {
            setSelectedTextFont(family);
            form.setFieldValue('textFont', family);
            message.success('Fuente del texto seleccionada');
        } else if (fontSelectorField === 'linkFont') {
            setSelectedLinkFont(family);
            form.setFieldValue('linkFont', family);
            message.success('Fuente de los enlaces seleccionada');
        }
        setFontSelectorVisible(false);
    };

    const openFontSelector = (fieldName) => {
        setFontSelectorField(fieldName);
        setFontSelectorVisible(true);
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            await api.put('/layouts/footer', values);
            message.success('Footer actualizado exitosamente');
            if (onSaved) {
                onSaved();
            }
        } catch (error) {
            message.error('Error al actualizar footer');
            console.error('Error saving footer:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    backgroundColor: '#001529'
                }}
            >
                <Form.Item
                    label="Texto de copyright"
                    name="copyrightText"
                    rules={[{ required: true, message: 'Por favor ingrese el texto de copyright' }]}
                >
                    <Input placeholder="© 2025 IIEG. Todos los derechos reservados." />
                </Form.Item>

                <Form.Item
                    label="Dirección"
                    name="address"
                >
                    <TextArea rows={2} placeholder="Dirección física" />
                </Form.Item>

                <Form.Item
                    label="Teléfono"
                    name="phone"
                >
                    <Input placeholder="Teléfono de contacto" />
                </Form.Item>

                <Form.Item
                    label="Email"
                    name="email"
                >
                    <Input type="email" placeholder="Email de contacto" />
                </Form.Item>

                <Form.Item
                    label="Enlaces de redes sociales (JSON)"
                    name="socialLinks"
                    tooltip="Formato: {&quot;facebook&quot;: &quot;url&quot;, &quot;twitter&quot;: &quot;url&quot;}"
                >
                    <TextArea
                        rows={4}
                        placeholder='{"facebook": "https://facebook.com/...", "twitter": "https://twitter.com/..."}'
                    />
                </Form.Item>

                <Form.Item
                    label="Color de fondo"
                    name="backgroundColor"
                >
                    <Input type="color" style={{ width: 100, height: 40 }} />
                </Form.Item>

                <Divider orientation="left">Tipografía</Divider>

                <Form.Item
                    label="Fuente del Texto"
                    name="textFont"
                    tooltip="Fuente tipográfica para textos generales del footer"
                >
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Button
                            icon={<FontSizeOutlined />}
                            onClick={() => openFontSelector('textFont')}
                            block
                        >
                            Seleccionar Fuente para Texto
                        </Button>
                        {selectedTextFont && (
                            <div style={{
                                padding: 12,
                                border: '1px solid #d9d9d9',
                                borderRadius: 4,
                                background: '#fafafa',
                                fontFamily: `'${selectedTextFont}', sans-serif`,
                                fontSize: 14
                            }}>
                                <strong>Familia seleccionada:</strong> {selectedTextFont}
                                <div style={{ marginTop: 8 }}>
                                    © 2025 IIEG. Todos los derechos reservados.
                                </div>
                            </div>
                        )}
                    </Space>
                </Form.Item>

                {selectedTextFont && textFontWeights.length > 0 && (
                    <Form.Item
                        label="Peso de la Fuente del Texto"
                        name="textFontWeight"
                        tooltip="Selecciona el peso (grosor) de la fuente para el texto"
                    >
                        <Select
                            placeholder="Selecciona un peso"
                            options={textFontWeights}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                )}

                <Form.Item
                    label="Fuente de los Enlaces"
                    name="linkFont"
                    tooltip="Fuente tipográfica para enlaces y links del footer"
                >
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Button
                            icon={<FontSizeOutlined />}
                            onClick={() => openFontSelector('linkFont')}
                            block
                        >
                            Seleccionar Fuente para Enlaces
                        </Button>
                        {selectedLinkFont && (
                            <div style={{
                                padding: 12,
                                border: '1px solid #d9d9d9',
                                borderRadius: 4,
                                background: '#fafafa',
                                fontFamily: `'${selectedLinkFont}', sans-serif`,
                                fontSize: 14
                            }}>
                                <strong>Familia seleccionada:</strong> {selectedLinkFont}
                                <div style={{ marginTop: 8 }}>
                                    Política de Privacidad • Términos de Uso • Contacto
                                </div>
                            </div>
                        )}
                    </Space>
                </Form.Item>

                {selectedLinkFont && linkFontWeights.length > 0 && (
                    <Form.Item
                        label="Peso de la Fuente de los Enlaces"
                        name="linkFontWeight"
                        tooltip="Selecciona el peso (grosor) de la fuente para los enlaces"
                    >
                        <Select
                            placeholder="Selecciona un peso"
                            options={linkFontWeights}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                )}

                <Form.Item>
                    <Space>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={loading}
                        >
                            Guardar Footer
                        </Button>
                        <Button
                            icon={<UndoOutlined />}
                            onClick={() => form.resetFields()}
                        >
                            Restablecer
                        </Button>
                    </Space>
                </Form.Item>
            </Form>

            <FontSelector
                visible={fontSelectorVisible}
                onCancel={() => setFontSelectorVisible(false)}
                onSelect={handleFontSelect}
                defaultFamily={fontSelectorField === 'textFont' ? selectedTextFont : selectedLinkFont}
                title={fontSelectorField === 'textFont' ? 'Seleccionar Fuente del Texto' : 'Seleccionar Fuente de los Enlaces'}
            />
        </Card>
    );
};

export default FooterLayoutForm;
