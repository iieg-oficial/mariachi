import { useEffect, useState, useCallback } from 'react';
import {
    Breadcrumb, Button, Card, Drawer, Empty, Form, Input, Modal,
    Select, Space, Spin, Table, Typography,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UsergroupAddOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import { gruposApi, usuariosApi } from '../services/formulariosAdminApi';
import MemberPicker from '../components/MemberPicker';

export default function GruposPage() {
    const navigate = useNavigate();
    const { isMobile } = useIsMobile();
    const [grupos, setGrupos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();
    const [modalOpen, setModalOpen] = useState(false);
    const [savingModal, setSavingModal] = useState(false);
    const [drawerGrupo, setDrawerGrupo] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [miembros, setMiembros] = useState([]);
    const [savingMiembros, setSavingMiembros] = useState(false);
    const [coordinadores, setCoordinadores] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setGrupos(await gruposApi.list());
        } catch {
            message.error('Error al cargar grupos');
            setGrupos([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                const u = await usuariosApi.list();
                if (!cancel) setUsuarios(u);
            } catch {
                message.error('Error al cargar usuarios');
            }
        })();
        return () => { cancel = true; };
    }, []);

    useEffect(() => {
        if (!drawerGrupo) return;
        let cancel = false;
        (async () => {
            try {
                const m = await gruposApi.listMiembros(drawerGrupo.id);
                if (cancel) return;
                setMiembros(m.map((x) => x.id));
                setCoordinadores(
                    m.filter((x) => x.rol_grupo === 'coordinador').map((x) => x.id),
                );
            } catch {
                message.error('Error al cargar miembros');
            }
        })();
        return () => { cancel = true; };
    }, [drawerGrupo]);

    const handleNew = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = async (record) => {
        setEditing(record);
        form.setFieldsValue({ nombre: record.nombre, descripcion: record.descripcion, miembros: [] });
        setModalOpen(true);
        try {
            const members = await gruposApi.listMiembros(record.id);
            form.setFieldValue('miembros', members.map((m) => m.id));
        } catch {
            message.error('Error al cargar miembros');
        }
    };

    const handleSubmit = async (values) => {
        setSavingModal(true);
        try {
            const { miembros: memberIds = [], ...data } = values;
            if (editing) {
                await gruposApi.update(editing.id, data);
                await gruposApi.actualizarMiembros(editing.id, memberIds);
                message.success('Grupo actualizado');
            } else {
                await gruposApi.create({ ...data, usuarios: memberIds });
                message.success('Grupo creado');
            }
            setModalOpen(false);
            setEditing(null);
            form.resetFields();
            load();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
        } finally {
            setSavingModal(false);
        }
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: '¿Eliminar grupo?',
            content: 'No se puede eliminar si tiene formularios asignados.',
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await gruposApi.eliminar(record.id);
                    message.success('Grupo eliminado');
                    load();
                } catch (err) {
                    message.error(err?.response?.data?.detail || 'Error al eliminar');
                }
            },
        });
    };

    const handleSaveMiembros = async () => {
        setSavingMiembros(true);
        try {
            await gruposApi.actualizarMiembros(drawerGrupo.id, miembros, coordinadores);
            message.success('Miembros actualizados');
            setDrawerGrupo(null);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar miembros');
        } finally {
            setSavingMiembros(false);
        }
    };

    const columns = [
        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
        { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <Space size="small" wrap>
                    <Button type="link" icon={<UsergroupAddOutlined />} onClick={() => setDrawerGrupo(record)}>
                        {!isMobile && 'Miembros'}
                    </Button>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        {!isMobile && 'Editar'}
                    </Button>
                    <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
                        {!isMobile && 'Eliminar'}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Breadcrumb
                items={[
                    {
                        title: 'Formularios',
                        onClick: () => navigate('/sieej/formularios'),
                        className: 'cursor-pointer',
                    },
                    { title: 'Grupos' },
                ]}
                style={{ marginBottom: 12 }}
            />
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: 12,
                marginBottom: 16,
            }}>
                <Space>
                    <TeamOutlined style={{ fontSize: 20 }} />
                    <Typography.Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>SIEEJ — Grupos</Typography.Title>
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleNew} block={isMobile}>
                    Nuevo grupo
                </Button>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={grupos}
                    rowKey="id"
                    loading={loading}
                    size={isMobile ? 'small' : 'middle'}
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="Sin grupos" /> }}
                />
            </Card>

            <Modal
                title={editing ? `Editar grupo: ${editing.nombre}` : 'Nuevo grupo'}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); }}
                onOk={() => form.submit()}
                okText={editing ? 'Actualizar' : 'Crear grupo'}
                cancelText="Cancelar"
                confirmLoading={savingModal}
                width={isMobile ? '100%' : 720}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        label="Nombre"
                        name="nombre"
                        rules={[{ required: true, message: 'Nombre requerido' }]}
                    >
                        <Input placeholder="Ejemplo: Secretaría de Salud" />
                    </Form.Item>
                    <Form.Item label="Descripción (opcional)" name="descripcion">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item label="Miembros (opcional)" name="miembros">
                        <MemberPicker usuarios={usuarios} />
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                open={!!drawerGrupo}
                onClose={() => setDrawerGrupo(null)}
                title={drawerGrupo ? `Miembros: ${drawerGrupo.nombre}` : ''}
                width={Math.min(700, window.innerWidth)}
                extra={
                    <Button type="primary" loading={savingMiembros} onClick={handleSaveMiembros}>
                        Guardar
                    </Button>
                }
            >
                {drawerGrupo ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <MemberPicker
                            usuarios={usuarios}
                            value={miembros}
                            onChange={(ids) => {
                                setMiembros(ids);
                                setCoordinadores((prev) => prev.filter((id) => ids.includes(id)));
                            }}
                        />
                        <div>
                            <Typography.Text strong>Coordinadores</Typography.Text>
                            <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                                En los formularios con captura colaborativa, solo ellos pueden
                                enviar el formulario del grupo. El resto captura y guarda.
                            </Typography.Paragraph>
                            <Select
                                mode="multiple"
                                allowClear
                                style={{ width: '100%' }}
                                placeholder="Nadie: el envío del grupo no se podrá enviar"
                                value={coordinadores}
                                onChange={setCoordinadores}
                                optionFilterProp="label"
                                options={usuarios
                                    .filter((u) => miembros.includes(u.id))
                                    .map((u) => ({
                                        value: u.id,
                                        label: `${u.name} (${u.username})`,
                                    }))}
                            />
                        </div>
                    </Space>
                ) : <Spin />}
            </Drawer>
        </div>
    );
}
