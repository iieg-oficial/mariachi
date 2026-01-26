import { useState, useEffect } from 'react';
import {
    Card, Form, Input, Button, Space, message, Spin, Divider,
    ColorPicker, Select, InputNumber, Row, Col, Typography, Tag, Modal
} from 'antd';
import {
    SaveOutlined, PlusOutlined, DeleteOutlined, BgColorsOutlined,
    FontSizeOutlined, UndoOutlined
} from '@ant-design/icons';
import api from '@services/api';
import FontSelector from '@components/FontSelector';

const { Title, Text } = Typography;

export default function Styles() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [styles, setStyles] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [fontSelectorVisible, setFontSelectorVisible] = useState(false);
    const [fontSelectorField, setFontSelectorField] = useState(null);
    const [selectedPrimaryFont, setSelectedPrimaryFont] = useState(null);
    const [selectedSecondaryFont, setSelectedSecondaryFont] = useState(null);
    const [selectedHeadingFont, setSelectedHeadingFont] = useState(null);
    const [selectedBodyFont, setSelectedBodyFont] = useState(null);
    const [selectedButtonFont, setSelectedButtonFont] = useState(null);

    useEffect(() => {
        loadStyles();
    }, []);

    const loadStyles = async () => {
        setLoading(true);
        try {
            const response = await api.get('/styles');
            const stylesData = response.data;
            setStyles(stylesData);
            form.setFieldsValue(stylesData);

            if (stylesData?.typography) {
                if (stylesData.typography.primaryFont) setSelectedPrimaryFont(stylesData.typography.primaryFont);
                if (stylesData.typography.secondaryFont) setSelectedSecondaryFont(stylesData.typography.secondaryFont);
                if (stylesData.typography.headingFont) setSelectedHeadingFont(stylesData.typography.headingFont);
                if (stylesData.typography.bodyFont) setSelectedBodyFont(stylesData.typography.bodyFont);
                if (stylesData.typography.buttonFont) setSelectedButtonFont(stylesData.typography.buttonFont);
            }

            setHasChanges(false);
        } catch (error) {
            console.error('Error loading styles:', error);
            message.error('Error al cargar los estilos');
        } finally {
            setLoading(false);
        }
    };

    const handleFontSelect = (family) => {
        const fieldMap = {
            'primaryFont': { setter: setSelectedPrimaryFont, path: ['typography', 'primaryFont'] },
            'secondaryFont': { setter: setSelectedSecondaryFont, path: ['typography', 'secondaryFont'] },
            'headingFont': { setter: setSelectedHeadingFont, path: ['typography', 'headingFont'] },
            'bodyFont': { setter: setSelectedBodyFont, path: ['typography', 'bodyFont'] },
            'buttonFont': { setter: setSelectedButtonFont, path: ['typography', 'buttonFont'] }
        };

        const field = fieldMap[fontSelectorField];
        if (field) {
            field.setter(family);
            form.setFieldValue(field.path, family);
            setHasChanges(true);
            message.success('Fuente seleccionada');
        }
        setFontSelectorVisible(false);
    };

    const openFontSelector = (fieldName) => {
        setFontSelectorField(fieldName);
        setFontSelectorVisible(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            await api.put('/styles', values);

            setStyles(values);
            setHasChanges(false);
            message.success('Estilos guardados exitosamente');
        } catch (error) {
            console.error('Error saving styles:', error);
            message.error('Error al guardar los estilos');
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        Modal.confirm({
            title: '¿Descartar cambios?',
            content: 'Se perderán todos los cambios no guardados.',
            okText: 'Descartar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                form.setFieldsValue(styles);
                setHasChanges(false);
            }
        });
    };

    const handleValuesChange = () => {
        setHasChanges(true);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <Card
                title={
                    <Space>
                        <BgColorsOutlined style={{ fontSize: 20 }} />
                        <span style={{ fontSize: 18, fontWeight: 600 }}>
                            Configuración de Estilos
                        </span>
                        {hasChanges && <Tag color="warning">Sin guardar</Tag>}
                    </Space>
                }
                extra={
                    <Space>
                        {hasChanges && (
                            <Button
                                icon={<UndoOutlined />}
                                onClick={handleDiscard}
                            >
                                Descartar
                            </Button>
                        )}
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            disabled={!hasChanges}
                            onClick={handleSave}
                        >
                            Guardar
                        </Button>
                    </Space>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={handleValuesChange}
                >
                    <Card
                        type="inner"
                        title={
                            <Space>
                                <FontSizeOutlined />
                                <span>Tipografías</span>
                            </Space>
                        }
                        style={{ marginBottom: 24 }}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Fuente de Títulos (H1, H2, H3)"
                                    name={['typography', 'headingFont']}
                                    tooltip="Fuente para todos los encabezados del sitio"
                                >
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button
                                            icon={<FontSizeOutlined />}
                                            onClick={() => openFontSelector('headingFont')}
                                            block
                                        >
                                            Seleccionar Fuente de Títulos
                                        </Button>
                                        {selectedHeadingFont && (
                                            <div style={{
                                                padding: 12,
                                                border: '1px solid #d9d9d9',
                                                borderRadius: 4,
                                                background: '#fafafa',
                                                fontFamily: `'${selectedHeadingFont}', sans-serif`
                                            }}>
                                                <strong>Familia:</strong> {selectedHeadingFont}
                                                <div style={{ marginTop: 8, fontSize: 24 }}>
                                                    Este es un título H1
                                                </div>
                                            </div>
                                        )}
                                    </Space>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="Fuente del Cuerpo (Párrafos)"
                                    name={['typography', 'bodyFont']}
                                    tooltip="Fuente para texto de párrafos y contenido"
                                >
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button
                                            icon={<FontSizeOutlined />}
                                            onClick={() => openFontSelector('bodyFont')}
                                            block
                                        >
                                            Seleccionar Fuente del Cuerpo
                                        </Button>
                                        {selectedBodyFont && (
                                            <div style={{
                                                padding: 12,
                                                border: '1px solid #d9d9d9',
                                                borderRadius: 4,
                                                background: '#fafafa',
                                                fontFamily: `'${selectedBodyFont}', sans-serif`,
                                                fontSize: 16
                                            }}>
                                                <strong>Familia:</strong> {selectedBodyFont}
                                                <div style={{ marginTop: 8 }}>
                                                    Este es un párrafo de texto normal. Así se verá el contenido del sitio.
                                                </div>
                                            </div>
                                        )}
                                    </Space>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    label="Fuente de Botones"
                                    name={['typography', 'buttonFont']}
                                    tooltip="Fuente para textos de botones y llamadas a la acción"
                                >
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button
                                            icon={<FontSizeOutlined />}
                                            onClick={() => openFontSelector('buttonFont')}
                                            block
                                        >
                                            Seleccionar Fuente de Botones
                                        </Button>
                                        {selectedButtonFont && (
                                            <div style={{
                                                padding: 12,
                                                border: '1px solid #d9d9d9',
                                                borderRadius: 4,
                                                background: '#fafafa',
                                                fontFamily: `'${selectedButtonFont}', sans-serif`
                                            }}>
                                                <strong>Familia:</strong> {selectedButtonFont}
                                                <div style={{ marginTop: 8 }}>
                                                    <Button type="primary" style={{ fontFamily: `'${selectedButtonFont}', sans-serif` }}>
                                                        Botón de Ejemplo
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Space>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider orientation="left">Tamaños de Fuente</Divider>

                        <Row gutter={16}>
                            <Col span={6}>
                                <Form.Item
                                    label="Heading 1"
                                    name={['typography', 'fontSize', 'h1']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                >
                                    <InputNumber
                                        min={16}
                                        max={72}
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    label="Heading 2"
                                    name={['typography', 'fontSize', 'h2']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                >
                                    <InputNumber
                                        min={16}
                                        max={72}
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    label="Heading 3"
                                    name={['typography', 'fontSize', 'h3']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                >
                                    <InputNumber
                                        min={16}
                                        max={72}
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    label="Texto Base"
                                    name={['typography', 'fontSize', 'base']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                >
                                    <InputNumber
                                        min={12}
                                        max={24}
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    <Card
                        type="inner"
                        title={
                            <Space>
                                <BgColorsOutlined />
                                <span>Paleta de Colores</span>
                            </Space>
                        }
                    >
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item
                                    label="Color Primario"
                                    name={['colors', 'primary']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                    getValueFromEvent={(color) => {
                                        return color?.toHexString ? color.toHexString() : color;
                                    }}
                                >
                                    <ColorPicker
                                        showText
                                        format="hex"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    label="Color Secundario"
                                    name={['colors', 'secondary']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                    getValueFromEvent={(color) => {
                                        return color?.toHexString ? color.toHexString() : color;
                                    }}
                                >
                                    <ColorPicker
                                        showText
                                        format="hex"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    label="Color de Acento"
                                    name={['colors', 'accent']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                    getValueFromEvent={(color) => {
                                        return color?.toHexString ? color.toHexString() : color;
                                    }}
                                >
                                    <ColorPicker
                                        showText
                                        format="hex"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider orientation="left">Colores de Texto</Divider>

                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item
                                    label="Texto Principal"
                                    name={['colors', 'textPrimary']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                    getValueFromEvent={(color) => {
                                        return color?.toHexString ? color.toHexString() : color;
                                    }}
                                >
                                    <ColorPicker
                                        showText
                                        format="hex"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    label="Texto Secundario"
                                    name={['colors', 'textSecondary']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                    getValueFromEvent={(color) => {
                                        return color?.toHexString ? color.toHexString() : color;
                                    }}
                                >
                                    <ColorPicker
                                        showText
                                        format="hex"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    label="Color de Fondo"
                                    name={['colors', 'background']}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                    getValueFromEvent={(color) => {
                                        return color?.toHexString ? color.toHexString() : color;
                                    }}
                                >
                                    <ColorPicker
                                        showText
                                        format="hex"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>
                </Form>
            </Card>

            <FontSelector
                visible={fontSelectorVisible}
                onCancel={() => setFontSelectorVisible(false)}
                onSelect={handleFontSelect}
                defaultFamily={(() => {
                    const fontMap = {
                        'primaryFont': selectedPrimaryFont,
                        'secondaryFont': selectedSecondaryFont,
                        'headingFont': selectedHeadingFont,
                        'bodyFont': selectedBodyFont,
                        'buttonFont': selectedButtonFont
                    };
                    return fontMap[fontSelectorField];
                })()}
                title={(() => {
                    const titleMap = {
                        'primaryFont': 'Seleccionar Fuente Principal',
                        'secondaryFont': 'Seleccionar Fuente Secundaria',
                        'headingFont': 'Seleccionar Fuente de Títulos',
                        'bodyFont': 'Seleccionar Fuente del Cuerpo',
                        'buttonFont': 'Seleccionar Fuente de Botones'
                    };
                    return titleMap[fontSelectorField] || 'Seleccionar Fuente';
                })()}
            />
        </div>
    );
}
