import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Space, Switch, Image, Divider, Select } from 'antd';
import { SaveOutlined, UndoOutlined, FileImageOutlined, FontSizeOutlined } from '@ant-design/icons';
import api from '@services/api';
import MediaSelector from '@components/MediaSelector';
import FontSelector from '@components/FontSelector';
import fontService from '@services/fontService';

const HeaderLayoutForm = ({ initialData, onSaved }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [mediaSelectorVisible, setMediaSelectorVisible] = useState(false);
    const [fontSelectorVisible, setFontSelectorVisible] = useState(false);
    const [fontSelectorField, setFontSelectorField] = useState(null);
    const [selectedLogo, setSelectedLogo] = useState(null);
    const [selectedTitleFont, setSelectedTitleFont] = useState(null);
    const [selectedMenuFont, setSelectedMenuFont] = useState(null);
    const [fontFamilies, setFontFamilies] = useState([]);
    const [titleFontWeights, setTitleFontWeights] = useState([]);
    const [menuFontWeights, setMenuFontWeights] = useState([]);

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
        if (selectedTitleFont && fontFamilies.length > 0) {
            const family = fontFamilies.find(f => f.family === selectedTitleFont);
            if (family) {
                const weights = family.variants.map((v, index) => ({
                    value: `${v.weight}-${v.style}`,
                    label: `${v.weight} - ${v.name} (${v.style})`,
                    weight: v.weight,
                    fontStyle: v.style
                }));
                setTitleFontWeights(weights);

                if (!form.getFieldValue('titleFontWeight')) {
                    const defaultWeight = weights.find(w => w.weight === 400 && w.fontStyle === 'normal') || weights[0];
                    form.setFieldValue('titleFontWeight', defaultWeight?.value);
                }
            }
        } else {
            setTitleFontWeights([]);
        }
    }, [selectedTitleFont, fontFamilies, form]);

    useEffect(() => {
        if (selectedMenuFont && fontFamilies.length > 0) {
            const family = fontFamilies.find(f => f.family === selectedMenuFont);
            if (family) {
                const weights = family.variants.map((v, index) => ({
                    value: `${v.weight}-${v.style}`,
                    label: `${v.weight} - ${v.name} (${v.style})`,
                    weight: v.weight,
                    fontStyle: v.style
                }));
                setMenuFontWeights(weights);

                if (!form.getFieldValue('menuFontWeight')) {
                    const defaultWeight = weights.find(w => w.weight === 400 && w.fontStyle === 'normal') || weights[0];
                    form.setFieldValue('menuFontWeight', defaultWeight?.value);
                }
            }
        } else {
            setMenuFontWeights([]);
        }
    }, [selectedMenuFont, fontFamilies, form]);

    useEffect(() => {
        if (initialData) {
            form.setFieldsValue(initialData);
            if (initialData.logoUrl) {
                setSelectedLogo(initialData.logoUrl);
            }
            if (initialData.titleFont) {
                setSelectedTitleFont(initialData.titleFont);
            }
            if (initialData.menuFont) {
                setSelectedMenuFont(initialData.menuFont);
            }
        }
    }, [initialData, form]);

    const handleLogoSelect = (file) => {
        setSelectedLogo(file.url);
        form.setFieldValue('logoUrl', file.url);
        setMediaSelectorVisible(false);
        message.success('Logo seleccionado correctamente');
    };

    const handleFontSelect = (family) => {
        if (fontSelectorField === 'titleFont') {
            setSelectedTitleFont(family);
            form.setFieldValue('titleFont', family);
            message.success('Fuente del título seleccionada');
        } else if (fontSelectorField === 'menuFont') {
            setSelectedMenuFont(family);
            form.setFieldValue('menuFont', family);
            message.success('Fuente del menú seleccionada');
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
            await api.put('/layouts/header', values);
            message.success('Header actualizado exitosamente');
            if (onSaved) {
                onSaved();
            }
        } catch (error) {
            message.error('Error al actualizar header');
            console.error('Error saving header:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Card>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{
                        backgroundColor: '#ffffff',
                        textColor: '#1f2937',
                        showNavigationMenu: true
                    }}
                >
                    <Form.Item
                        label="Título"
                        name="title"
                        rules={[{ required: true, message: 'Por favor ingrese el título' }]}
                    >
                        <Input size="large" placeholder="Título del sitio" />
                    </Form.Item>

                    <Form.Item
                        label="Subtítulo"
                        name="subtitle"
                    >
                        <Input placeholder="Subtítulo o descripción" />
                    </Form.Item>

                    <Form.Item
                        label="Logo"
                        name="logoUrl"
                    >
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            <Button
                                icon={<FileImageOutlined />}
                                onClick={() => setMediaSelectorVisible(true)}
                                block
                            >
                                Seleccionar Logo desde Media
                            </Button>
                            {selectedLogo && (
                                <div style={{
                                    padding: 12,
                                    border: '1px solid #d9d9d9',
                                    borderRadius: 4,
                                    background: '#fafafa'
                                }}>
                                    <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                                        <Image
                                            src={selectedLogo}
                                            alt="Logo seleccionado"
                                            style={{ maxHeight: 100, maxWidth: 200, objectFit: 'contain' }}
                                        />
                                        <small style={{ color: '#8c8c8c', wordBreak: 'break-all' }}>
                                            {selectedLogo}
                                        </small>
                                    </Space>
                                </div>
                            )}
                        </Space>
                    </Form.Item>

                    <Form.Item
                        label="Mostrar menú de navegación"
                        name="showNavigationMenu"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="Color de fondo"
                        name="backgroundColor"
                    >
                        <Input type="color" style={{ width: 100, height: 40 }} />
                    </Form.Item>

                    <Form.Item
                        label="Color de texto"
                        name="textColor"
                        tooltip="Color del texto del logo y elementos del header"
                    >
                        <Input type="color" style={{ width: 100, height: 40 }} />
                    </Form.Item>

                    <Divider orientation="left">Tipografía</Divider>

                    <Form.Item
                        label="Fuente del Título"
                        name="titleFont"
                        tooltip="Fuente tipográfica para el título del sitio"
                    >
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            <Button
                                icon={<FontSizeOutlined />}
                                onClick={() => openFontSelector('titleFont')}
                                block
                            >
                                Seleccionar Fuente para Título
                            </Button>
                            {selectedTitleFont && (
                                <div style={{
                                    padding: 12,
                                    border: '1px solid #d9d9d9',
                                    borderRadius: 4,
                                    background: '#fafafa',
                                    fontFamily: `'${selectedTitleFont}', sans-serif`,
                                    fontSize: 18
                                }}>
                                    <strong>Familia seleccionada:</strong> {selectedTitleFont}
                                    <div style={{ marginTop: 8, fontSize: 20 }}>
                                        Vista previa del título
                                    </div>
                                </div>
                            )}
                        </Space>
                    </Form.Item>

                    {selectedTitleFont && titleFontWeights.length > 0 && (
                        <Form.Item
                            label="Peso de la Fuente del Título"
                            name="titleFontWeight"
                            tooltip="Selecciona el peso (grosor) de la fuente para el título"
                        >
                            <Select
                                placeholder="Selecciona un peso"
                                options={titleFontWeights}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    )}

                    <Form.Item
                        label="Fuente del Menú"
                        name="menuFont"
                        tooltip="Fuente tipográfica para los elementos del menú de navegación"
                    >
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            <Button
                                icon={<FontSizeOutlined />}
                                onClick={() => openFontSelector('menuFont')}
                                block
                            >
                                Seleccionar Fuente para Menú
                            </Button>
                            {selectedMenuFont && (
                                <div style={{
                                    padding: 12,
                                    border: '1px solid #d9d9d9',
                                    borderRadius: 4,
                                    background: '#fafafa',
                                    fontFamily: `'${selectedMenuFont}', sans-serif`,
                                    fontSize: 14
                                }}>
                                    <strong>Familia seleccionada:</strong> {selectedMenuFont}
                                    <div style={{ marginTop: 8 }}>
                                        Inicio • Nosotros • Publicaciones • Contacto
                                    </div>
                                </div>
                            )}
                        </Space>
                    </Form.Item>

                    {selectedMenuFont && menuFontWeights.length > 0 && (
                        <Form.Item
                            label="Peso de la Fuente del Menú"
                            name="menuFontWeight"
                            tooltip="Selecciona el peso (grosor) de la fuente para el menú"
                        >
                            <Select
                                placeholder="Selecciona un peso"
                                options={menuFontWeights}
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
                                Guardar Header
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
            </Card>

            <MediaSelector
                visible={mediaSelectorVisible}
                onCancel={() => setMediaSelectorVisible(false)}
                onSelect={handleLogoSelect}
                defaultFolder="logotipos"
                fileType="image"
                title="Seleccionar Logo"
            />

            <FontSelector
                visible={fontSelectorVisible}
                onCancel={() => setFontSelectorVisible(false)}
                onSelect={handleFontSelect}
                defaultFamily={fontSelectorField === 'titleFont' ? selectedTitleFont : selectedMenuFont}
                title={fontSelectorField === 'titleFont' ? 'Seleccionar Fuente del Título' : 'Seleccionar Fuente del Menú'}
            />
        </>
    );
};

export default HeaderLayoutForm;
