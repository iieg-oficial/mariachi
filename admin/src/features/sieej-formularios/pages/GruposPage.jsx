import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Breadcrumb, Button, Card, Drawer, Empty, Form, Input, Modal, Select,
    Space, Spin, Table, Typography,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UsergroupAddOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import { gruposApi, usuariosApi } from '../services/formulariosAdminApi';

export default function GruposPage() {
    const navigate = useNavigate();
    const { isMobile } = useIsMobile();
    const [grupos, setGrupos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();
    const nombreRef = useRef(null);
    const [drawerGrupo, setDrawerGrupo] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [miembros, setMiembros] = useState([]);
    const [savingMiembros, setSavingMiembros] = useState(false);

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
        if (!drawerGrupo) return;
        let cancel = false;
        (async () => {
            try {
                const [u, m] = await Promise.all([
                    usuariosApi.list(),
                    gruposApi.listMiembros(drawerGrupo.id),
                ]);
                if (cancel) return;
                setUsuarios(u);
                setMiembros(m.map((x) => x.id));
            } catch {
                message.error('Error al cargar miembros');
            }
        })();
        return () => { cancel = true; };
    }, [drawerGrupo]);

    const handleNew = () => {
        setEditing(null);
        form.resetFields();
        nombreRef.current?.focus();
    };

    const handleEdit = (record) => {
        setEditing(record);
        form.setFieldsValue(record);
    };

    const handleSubmit = async (values) => {
        try {
            if (editing) {
                await gruposApi.update(editing.id, values);
                message.success('Grupo actualizado');
            } else {
                await gruposApi.create(values);
                message.success('Grupo creado');
            }
            setEditing(null);
            form.resetFields();
            load();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
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
            await gruposApi.actualizarMiembros(drawerGrupo.id, miembros);
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
                <Form form={form} layout="inline" onFinish={handleSubmit} style={{ marginBottom: 16 }}>
                    <Form.Item name="nombre" rules={[{ required: true }]}>
                        <Input ref={nombreRef} placeholder="Nombre del grupo" />
                    </Form.Item>
                    <Form.Item name="descripcion">
                        <Input placeholder="Descripción (opcional)" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">{editing ? 'Actualizar' : 'Crear'}</Button>
                        {editing && <Button onClick={() => { setEditing(null); form.resetFields(); }} style={{ marginLeft: 8 }}>Cancelar</Button>}
                    </Form.Item>
                </Form>
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

            <Drawer
                open={!!drawerGrupo}
                onClose={() => setDrawerGrupo(null)}
                title={drawerGrupo ? `Miembros: ${drawerGrupo.nombre}` : ''}
                width={Math.min(560, window.innerWidth)}
                extra={
                    <Button type="primary" loading={savingMiembros} onClick={handleSaveMiembros}>
                        Guardar
                    </Button>
                }
            >
                {drawerGrupo ? (
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        placeholder="Selecciona usuarios"
                        value={miembros}
                        onChange={setMiembros}
                        optionFilterProp="label"
                        options={usuarios.map((u) => ({
                            value: u.id,
                            label: `${u.username} (${u.name})`,
                        }))}
                    />
                ) : <Spin />}
            </Drawer>
        </div>
    );
}
