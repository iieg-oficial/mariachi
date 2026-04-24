import { useEffect, useState, useCallback } from 'react';
import {
    Alert,
    Button,
    Card,
    Empty,
    Form,
    Input,
    Modal,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Title, Paragraph } = Typography;

export default function FormulariosPage() {
    const { isMobile } = useIsMobile();
    const [formularios, setFormularios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();

    const loadFormularios = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/formularios');
            setFormularios(res.data);
        } catch (err) {
            if (err?.response?.status !== 404) {
                message.error('Error al cargar formularios');
            }
            setFormularios([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFormularios();
    }, [loadFormularios]);

    const handleCreate = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = (record) => {
        setEditing(record);
        form.setFieldsValue(record);
        setModalOpen(true);
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: '¿Eliminar formulario?',
            content: `Se eliminará "${record.name}".`,
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await api.delete(`/formularios/${record.id}`);
                    message.success('Formulario eliminado');
                    loadFormularios();
                } catch {
                    message.error('Error al eliminar');
                }
            },
        });
    };

    const handleSubmit = async (values) => {
        try {
            if (editing) {
                await api.put(`/formularios/${editing.id}`, values);
                message.success('Formulario actualizado');
            } else {
                await api.post('/formularios', values);
                message.success('Formulario creado');
            }
            setModalOpen(false);
            loadFormularios();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
        }
    };

    const columns = [
        { title: 'Slug', dataIndex: 'slug', key: 'slug' },
        { title: 'Nombre', dataIndex: 'name', key: 'name' },
        { title: 'Descripción', dataIndex: 'description', key: 'description', ellipsis: true },
        {
            title: 'Estado',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: isMobile ? undefined : 200,
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        {isMobile ? '' : 'Editar'}
                    </Button>
                    <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
                        {isMobile ? '' : 'Eliminar'}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: 12,
                marginBottom: 16,
            }}>
                <Space>
                    <FormOutlined style={{ fontSize: 20 }} />
                    <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>SIEEJ — Formularios</Title>
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} block={isMobile}>
                    Nuevo formulario
                </Button>
            </div>

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Módulo SIEEJ en construcción"
                description={
                    <Paragraph style={{ margin: 0 }}>
                        Administrador genérico de formularios. El backend aún no expone estos endpoints;
                        cuando existan, esta página los consumirá directamente.
                    </Paragraph>
                }
            />

            <Card styles={{ body: { padding: isMobile ? 0 : undefined } }}>
                <Table
                    columns={columns}
                    dataSource={formularios}
                    rowKey="id"
                    loading={loading}
                    size={isMobile ? 'small' : 'middle'}
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 10, simple: isMobile }}
                    locale={{
                        emptyText: (
                            <Empty
                                description={
                                    <span>
                                        Aún no hay formularios.<br />
                                        <small>Usa “Nuevo formulario” para crear el primero.</small>
                                    </span>
                                }
                            />
                        ),
                    }}
                />
            </Card>

            <Modal
                title={editing ? 'Editar formulario' : 'Nuevo formulario'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                okText={editing ? 'Actualizar' : 'Crear'}
                cancelText="Cancelar"
                width={isMobile ? '100%' : 560}
                centered={isMobile}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        label="Slug"
                        name="slug"
                        rules={[{ required: true, message: 'Slug requerido' }]}
                    >
                        <Input placeholder="registro-ciudadano" />
                    </Form.Item>
                    <Form.Item
                        label="Nombre"
                        name="name"
                        rules={[{ required: true, message: 'Nombre requerido' }]}
                    >
                        <Input placeholder="Registro ciudadano" />
                    </Form.Item>
                    <Form.Item label="Descripción" name="description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
