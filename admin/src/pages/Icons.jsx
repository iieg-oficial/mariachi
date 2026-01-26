import { useState, useEffect } from 'react';
import { Table, Card, Typography, Button, message, Modal, Form, Input, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import api from '@services/api';

const { Title } = Typography;
const { TextArea } = Input;

export default function Icons() {
    const [icons, setIcons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [editingIcon, setEditingIcon] = useState(null);
    const [previewIcon, setPreviewIcon] = useState(null);
    const [svgPreview, setSvgPreview] = useState('');
    const [form] = Form.useForm();

    useEffect(() => {
        fetchIcons();
    }, []);

    const fetchIcons = async () => {
        setLoading(true);
        try {
            const response = await api.get('/icons');
            setIcons(response.data);
        } catch {
            message.error('Error al cargar iconos');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingIcon(null);
        setSvgPreview('');
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (icon) => {
        setEditingIcon(icon);
        setSvgPreview(icon.svg);
        form.setFieldsValue(icon);
        setModalVisible(true);
    };

    const handlePreview = (icon) => {
        setPreviewIcon(icon);
        setPreviewVisible(true);
    };

    const handleDelete = (icon) => {
        Modal.confirm({
            title: '¿Está seguro de eliminar este icono?',
            content: `Se eliminará: ${icon.name}`,
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await api.delete(`/icons/${icon.id}`);
                    message.success('Icono eliminado exitosamente');
                    fetchIcons();
                } catch {
                    message.error('Error al eliminar icono');
                }
            }
        });
    };

    const handleSubmit = async (values) => {
        try {
            if (editingIcon) {
                await api.put(`/icons/${editingIcon.id}`, values);
                message.success('Icono actualizado exitosamente');
            } else {
                await api.post('/icons', values);
                message.success('Icono creado exitosamente');
            }
            setModalVisible(false);
            fetchIcons();
        } catch {
            message.error(editingIcon ? 'Error al actualizar icono' : 'Error al crear icono');
        }
    };

    const handleSvgChange = (e) => {
        const svg = e.target.value;
        setSvgPreview(svg);
    };

    const columns = [
        {
            title: 'Vista previa',
            dataIndex: 'svg',
            key: 'preview',
            width: 100,
            render: (svg) => (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        color: '#1890ff'
                    }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            )
        },
        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name)
        },
        {
            title: 'Fecha de creación',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 200,
            render: (date) => new Date(date).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 200,
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreview(record)}
                    >
                        Ver
                    </Button>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        Editar
                    </Button>
                    <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                    >
                        Eliminar
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Banco de Iconos</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreate}
                >
                    Nuevo Icono
                </Button>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={icons}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total: ${total} iconos`
                    }}
                />
            </Card>

            <Modal
                title={editingIcon ? 'Editar Icono' : 'Nuevo Icono'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                okText={editingIcon ? 'Actualizar' : 'Crear'}
                cancelText="Cancelar"
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        label={<span style={{ fontSize: 14, fontWeight: 500 }}>Nombre del icono</span>}
                        name="name"
                        rules={[{ required: true, message: 'Por favor ingrese el nombre del icono' }]}
                    >
                        <Input
                            size="large"
                            placeholder="Estrella, Corazón, Usuario..."
                        />
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ fontSize: 14, fontWeight: 500 }}>Código SVG</span>}
                        name="svg"
                        rules={[{ required: true, message: 'Por favor ingrese el código SVG' }]}
                    >
                        <TextArea
                            rows={8}
                            placeholder='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">...</svg>'
                            style={{ fontFamily: 'monospace', fontSize: 12 }}
                            onChange={handleSvgChange}
                        />
                    </Form.Item>

                    {svgPreview && (
                        <div style={{
                            padding: 16,
                            background: '#fafafa',
                            borderRadius: 6,
                            border: '1px solid #f0f0f0'
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: '#595959' }}>
                                Vista previa:
                            </div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                <div
                                    style={{
                                        fontSize: 16,
                                        color: '#1890ff',
                                        display: 'flex'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: svgPreview }}
                                />
                                <div
                                    style={{
                                        fontSize: 24,
                                        color: '#52c41a',
                                        display: 'flex'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: svgPreview }}
                                />
                                <div
                                    style={{
                                        fontSize: 32,
                                        color: '#fa8c16',
                                        display: 'flex'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: svgPreview }}
                                />
                                <div
                                    style={{
                                        fontSize: 48,
                                        color: '#eb2f96',
                                        display: 'flex'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: svgPreview }}
                                />
                            </div>
                        </div>
                    )}
                </Form>
            </Modal>

            <Modal
                title="Vista previa del icono"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setPreviewVisible(false)}>
                        Cerrar
                    </Button>
                ]}
            >
                {previewIcon && (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                                {previewIcon.name}
                            </Tag>
                        </div>
                        <div style={{
                            padding: 24,
                            background: '#fafafa',
                            borderRadius: 6,
                            textAlign: 'center'
                        }}>
                            <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center' }}>
                                <div
                                    style={{
                                        fontSize: 24,
                                        color: '#1890ff',
                                        display: 'flex'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: previewIcon.svg }}
                                />
                                <div
                                    style={{
                                        fontSize: 36,
                                        color: '#52c41a',
                                        display: 'flex'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: previewIcon.svg }}
                                />
                                <div
                                    style={{
                                        fontSize: 48,
                                        color: '#fa8c16',
                                        display: 'flex'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: previewIcon.svg }}
                                />
                                <div
                                    style={{
                                        fontSize: 64,
                                        color: '#eb2f96',
                                        display: 'flex'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: previewIcon.svg }}
                                />
                            </div>
                        </div>
                        <div style={{
                            marginTop: 16,
                            padding: 12,
                            background: '#f5f5f5',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: 11,
                            wordBreak: 'break-all',
                            maxHeight: 200,
                            overflow: 'auto'
                        }}>
                            {previewIcon.svg}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
