import { useState, useEffect } from 'react';
import {
    Card, Button, Table, Space, message, Popconfirm, Row, Col, Statistic,
    Tag, Typography, Empty, Spin, Divider, Collapse, Modal, Form, Input, Select, InputNumber
} from 'antd';
import {
    FontSizeOutlined, PlusOutlined, DeleteOutlined, DownloadOutlined,
    FileOutlined, CloudUploadOutlined, EditOutlined
} from '@ant-design/icons';
import fontService from '@services/fontService';
import FontUploader from '@components/FontUploader';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const Fonts = () => {
    const [loading, setLoading] = useState(false);
    const [fontFamilies, setFontFamilies] = useState([]);
    const [uploaderVisible, setUploaderVisible] = useState(false);
    const [previewFamily, setPreviewFamily] = useState(null);
    const [editingFont, setEditingFont] = useState(null);
    const [editModalVisible, setEditModalVisible] = useState(false);

    useEffect(() => {
        loadFonts();
    }, []);

    const loadFonts = async () => {
        try {
            setLoading(true);
            const data = await fontService.getFontFamilies();
            setFontFamilies(data);
        } catch (error) {
            message.error('Error al cargar fuentes');
            console.error('Error loading fonts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (fontId, fontName) => {
        try {
            await fontService.deleteFont(fontId);
            message.success(`Fuente "${fontName}" eliminada exitosamente`);
            loadFonts();
        } catch (error) {
            message.error('Error al eliminar fuente');
            console.error('Error deleting font:', error);
        }
    };

    const handleUploadSuccess = () => {
        setUploaderVisible(false);
        loadFonts();
    };

    const handleEditSubmit = async (values) => {
        try {
            await fontService.updateFont(editingFont.id, values);
            message.success(`Fuente "${values.name}" actualizada exitosamente`);
            setEditModalVisible(false);
            setEditingFont(null);
            loadFonts();
        } catch (error) {
            message.error('Error al actualizar fuente');
            console.error('Error updating font:', error);
        }
    };

    const copyFamilyName = (family) => {
        navigator.clipboard.writeText(family);
        message.success(`Copiado: "${family}"`);
    };

    const stats = {
        totalFamilies: fontFamilies.length,
        totalVariants: fontFamilies.reduce((sum, f) => sum + f.variants.length, 0),
        totalSize: fontFamilies.reduce((sum, f) =>
            sum + f.variants.reduce((s, v) => s + (v.file_size || 0), 0), 0
        )
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getWeightLabel = (weight) => {
        const labels = {
            100: 'Thin',
            200: 'Extra Light',
            300: 'Light',
            400: 'Regular',
            500: 'Medium',
            600: 'Semi Bold',
            700: 'Bold',
            800: 'Extra Bold',
            900: 'Black'
        };
        return labels[weight] || weight;
    };

    const columns = [
        {
            title: 'Variante',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <FileOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: 'Peso',
            dataIndex: 'weight',
            key: 'weight',
            width: 150,
            render: (weight) => (
                <Tag color="blue">{weight} - {getWeightLabel(weight)}</Tag>
            )
        },
        {
            title: 'Estilo',
            dataIndex: 'style',
            key: 'style',
            width: 100,
            render: (style) => (
                <Tag color={style === 'normal' ? 'default' : 'purple'}>
                    {style}
                </Tag>
            )
        },
        {
            title: 'Formato',
            dataIndex: 'format',
            key: 'format',
            width: 100,
            render: (format) => (
                <Tag color="green">{format.toUpperCase()}</Tag>
            )
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => window.open(record.url, '_blank')}
                        title="Descargar fuente"
                    />
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingFont(record);
                            setEditModalVisible(true);
                        }}
                        title="Editar propiedades"
                    />
                    <Popconfirm
                        title="¿Eliminar esta variante?"
                        description={`Se eliminará "${record.name}"`}
                        onConfirm={() => handleDelete(record.id, record.name)}
                        okText="Sí, eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            title="Eliminar"
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <Title level={2} style={{ margin: 0 }}>
                            <FontSizeOutlined /> Gestión de Fuentes Tipográficas
                        </Title>
                        <Text type="secondary">
                            Administra las fuentes personalizadas disponibles en el sistema
                        </Text>
                    </div>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => setUploaderVisible(true)}
                    >
                        Subir Nueva Fuente
                    </Button>
                </div>

                <Row gutter={16}>
                    <Col xs={24} sm={8}>
                        <Card>
                            <Statistic
                                title="Familias Tipográficas"
                                value={stats.totalFamilies}
                                prefix={<FontSizeOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card>
                            <Statistic
                                title="Total de Variantes"
                                value={stats.totalVariants}
                                prefix={<FileOutlined />}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card>
                            <Statistic
                                title="Espacio Utilizado"
                                value={formatBytes(stats.totalSize)}
                                prefix={<CloudUploadOutlined />}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>
                    </Col>
                </Row>
            </div>

            <Card>
                <Spin spinning={loading}>
                    {fontFamilies.length === 0 && !loading ? (
                        <Empty
                            description="No hay fuentes disponibles"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            style={{ padding: '60px 0' }}
                        >
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setUploaderVisible(true)}
                            >
                                Subir Primera Fuente
                            </Button>
                        </Empty>
                    ) : (
                        <Collapse
                            accordion
                            expandIconPosition="end"
                            onChange={(key) => setPreviewFamily(key)}
                        >
                            {fontFamilies.map((familyData) => (
                                <Panel
                                    key={familyData.family}
                                    header={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 }}>
                                            <Space>
                                                <FontSizeOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                                                <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                                                    {familyData.family}
                                                </span>
                                                <Tag color="blue">{familyData.variants.length} variante{familyData.variants.length !== 1 ? 's' : ''}</Tag>
                                            </Space>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyFamilyName(familyData.family);
                                                }}
                                            >
                                                Copiar nombre
                                            </Button>
                                        </div>
                                    }
                                >
                                    <div style={{
                                        padding: 16,
                                        background: '#fafafa',
                                        borderRadius: 4,
                                        marginBottom: 16,
                                    }}>
                                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                                            Vista previa con todas las variantes:
                                        </Text>

                                        {familyData.variants.map((variant) => {
                                            const fontFaceStyle = `
                                                @font-face {
                                                    font-family: '${variant.family}';
                                                    src: url('${variant.url}') format('${variant.format}');
                                                    font-weight: ${variant.weight};
                                                    font-style: ${variant.style};
                                                    font-display: swap;
                                                }
                                            `;

                                            return (
                                                <div key={variant.id} style={{ marginBottom: 12 }}>
                                                    <style>{fontFaceStyle}</style>
                                                    <div style={{
                                                        fontSize: 18,
                                                        fontFamily: `'${variant.family}', sans-serif`,
                                                        fontWeight: variant.weight,
                                                        fontStyle: variant.style,
                                                        marginBottom: 4
                                                    }}>
                                                        El veloz murciélago hindú comía feliz cardillo y kiwi. 0123456789
                                                    </div>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        {variant.name} (weight: {variant.weight}, style: {variant.style})
                                                    </Text>
                                                </div>
                                            );
                                        })}

                                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e8e8e8' }}>
                                            <Text code>font-family: '{familyData.family}', sans-serif;</Text>
                                        </div>
                                    </div>

                                    <Table
                                        dataSource={familyData.variants}
                                        columns={columns}
                                        rowKey="id"
                                        pagination={false}
                                        size="small"
                                    />
                                </Panel>
                            ))}
                        </Collapse>
                    )}
                </Spin>
            </Card>

            <Modal
                title="Editar Propiedades de la Fuente"
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setEditingFont(null);
                }}
                footer={null}
                width={600}
            >
                {editingFont && (
                    <Form
                        layout="vertical"
                        initialValues={{
                            name: editingFont.name,
                            family: editingFont.family,
                            style: editingFont.style,
                            weight: editingFont.weight,
                        }}
                        onFinish={handleEditSubmit}
                    >
                        <Form.Item
                            label="Nombre Descriptivo"
                            name="name"
                            rules={[
                                { required: true, message: 'Por favor ingresa un nombre descriptivo' },
                                { min: 2, message: 'El nombre debe tener al menos 2 caracteres' },
                            ]}
                            tooltip="Ej: 'Montserrat Bold', 'Roboto Italic'"
                        >
                            <Input placeholder="Montserrat Bold" />
                        </Form.Item>

                        <Form.Item
                            label="Familia de Fuente (font-family)"
                            name="family"
                            rules={[
                                { required: true, message: 'Por favor ingresa la familia de fuente' },
                                { min: 2, message: 'La familia debe tener al menos 2 caracteres' },
                            ]}
                            tooltip="Nombre CSS que usarás en font-family. Ej: 'Montserrat', 'Roboto'"
                        >
                            <Input placeholder="Montserrat" />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Estilo"
                                    name="style"
                                    rules={[{ required: true, message: 'Por favor selecciona un estilo' }]}
                                >
                                    <Select>
                                        <Select.Option value="normal">Normal</Select.Option>
                                        <Select.Option value="italic">Italic</Select.Option>
                                        <Select.Option value="oblique">Oblique</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="Peso (Weight)"
                                    name="weight"
                                    rules={[
                                        { required: true, message: 'Por favor ingresa un peso' },
                                        { type: 'number', min: 100, max: 900, message: 'Debe estar entre 100 y 900' },
                                    ]}
                                    tooltip="100 (Thin) a 900 (Black). Común: 400 (Regular), 700 (Bold)"
                                >
                                    <InputNumber
                                        min={100}
                                        max={900}
                                        step={100}
                                        style={{ width: '100%' }}
                                        placeholder="400"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
                            <Button onClick={() => {
                                setEditModalVisible(false);
                                setEditingFont(null);
                            }}>
                                Cancelar
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Guardar Cambios
                            </Button>
                        </div>
                    </Form>
                )}
            </Modal>

            <FontUploader
                visible={uploaderVisible}
                onCancel={() => setUploaderVisible(false)}
                onSuccess={handleUploadSuccess}
            />
        </div>
    );
};

export default Fonts;
