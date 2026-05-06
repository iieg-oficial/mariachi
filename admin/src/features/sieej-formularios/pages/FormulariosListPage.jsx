import { useEffect, useState, useCallback } from 'react';
import {
    Button, Card, Empty, Form, Input, Modal, Space, Table, Tag, Typography,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, FormOutlined,
    PlayCircleOutlined, CloseCircleOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';

const { Title, Paragraph } = Typography;

const ESTADO_COLOR = { borrador: 'default', activo: 'green', cerrado: 'red' };

const DEFAULT_DEFINICION = {
    version: 1,
    steps: [
        {
            id: 'general',
            type: 'form',
            title: 'Datos generales',
            fields: [
                { name: 'razon_social', label: 'Razon social', type: 'text', required: true },
            ],
        },
    ],
};

export default function FormulariosListPage() {
    const navigate = useNavigate();
    const { isMobile } = useIsMobile();
    const [formularios, setFormularios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await formulariosApi.list();
            setFormularios(data);
        } catch (err) {
            if (err?.response?.status !== 404) message.error('Error al cargar formularios');
            setFormularios([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = () => {
        form.resetFields();
        setModalOpen(true);
    };

    const handleSubmitNew = async (values) => {
        try {
            const created = await formulariosApi.create({
                slug: values.slug,
                nombre: values.nombre,
                descripcion: values.descripcion,
                definicion: DEFAULT_DEFINICION,
            });
            message.success('Formulario creado');
            setModalOpen(false);
            navigate(`/sieej/formularios/${created.id}`);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al crear');
        }
    };

    const handlePublicar = async (record) => {
        try {
            await formulariosApi.publicar(record.id);
            message.success('Formulario publicado');
            load();
        } catch {
            message.error('Error al publicar');
        }
    };

    const handleCerrar = async (record) => {
        Modal.confirm({
            title: '¿Cerrar formulario?',
            content: 'Los respondents ya no podrán enviarlo. Los envíos existentes se mantienen.',
            okText: 'Cerrar',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await formulariosApi.cerrar(record.id);
                    message.success('Formulario cerrado');
                    load();
                } catch {
                    message.error('Error al cerrar');
                }
            },
        });
    };

    const handleEliminar = (record) => {
        Modal.confirm({
            title: '¿Eliminar formulario?',
            content: `Si tiene envíos asociados, se cerrará en vez de eliminarse.`,
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await formulariosApi.eliminar(record.id);
                    message.success('Operación completada');
                    load();
                } catch (err) {
                    message.error(err?.response?.data?.detail || 'Error al eliminar');
                }
            },
        });
    };

    const columns = [
        { title: 'Slug', dataIndex: 'slug', key: 'slug' },
        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            render: (v) => <Tag color={ESTADO_COLOR[v]}>{v}</Tag>,
        },
        { title: 'Versión', dataIndex: 'version', key: 'version', width: 80 },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <Space size="small" wrap>
                    <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/sieej/formularios/${record.id}`)}>
                        {!isMobile && 'Editar'}
                    </Button>
                    {record.estado === 'borrador' && (
                        <Button type="link" icon={<PlayCircleOutlined />} onClick={() => handlePublicar(record)}>
                            {!isMobile && 'Publicar'}
                        </Button>
                    )}
                    {record.estado === 'activo' && (
                        <Button type="link" icon={<CloseCircleOutlined />} onClick={() => handleCerrar(record)}>
                            {!isMobile && 'Cerrar'}
                        </Button>
                    )}
                    <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleEliminar(record)}>
                        {!isMobile && 'Eliminar'}
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
                <Space>
                    <Button icon={<TeamOutlined />} onClick={() => navigate('/sieej/grupos')}>
                        Grupos
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} block={isMobile}>
                        Nuevo formulario
                    </Button>
                </Space>
            </div>

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
                                    <Paragraph style={{ margin: 0 }}>
                                        Aún no hay formularios. Usa "Nuevo formulario" para crear el primero.
                                    </Paragraph>
                                }
                            />
                        ),
                    }}
                />
            </Card>

            <Modal
                title="Nuevo formulario"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                okText="Crear"
                cancelText="Cancelar"
                width={isMobile ? '100%' : 560}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmitNew}>
                    <Form.Item
                        label="Slug"
                        name="slug"
                        rules={[
                            { required: true, message: 'Slug requerido' },
                            { pattern: /^[a-z0-9][a-z0-9-_]*$/, message: 'Solo minusculas, dígitos, - y _' },
                        ]}
                    >
                        <Input placeholder="registro-ciudadano" />
                    </Form.Item>
                    <Form.Item
                        label="Nombre"
                        name="nombre"
                        rules={[{ required: true, message: 'Nombre requerido' }]}
                    >
                        <Input placeholder="Registro ciudadano" />
                    </Form.Item>
                    <Form.Item label="Descripción" name="descripcion">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
