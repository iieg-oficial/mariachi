import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Col, Empty, Form, Input, Modal, Row, Select, Skeleton, Typography, Button, Checkbox, Divider, Pagination } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import api from '@shared/services/api';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import UserCard from '../components/UserCard';

const { Title } = Typography;

const roleLabels = {
    tetlamamakani: 'Administradora',
    editora: 'Editora',
    externo: 'Externo',
};

const PAGE_SIZE = 12;

export default function Users() {
    const { isMobile } = useIsMobile();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();
    const selectedRole = Form.useWatch('role', form);
    const projectAssignments = Form.useWatch('project_assignments', form) || {};
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await api.get('/usuarios');
            setUsers(response.data);
        } catch {
            message.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all([api.get('/usuarios'), api.get('/projects')])
            .then(([usersRes, projectsRes]) => {
                if (cancelled) return;
                setUsers(usersRes.data);
                setProjects(projectsRes.data);
            })
            .catch(() => message.error('Error al cargar datos'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const assignmentsToFormValue = (projectsList) => {
        const value = {};
        for (const p of projectsList || []) {
            value[p.slug] = { enabled: true, project_role: p.project_role };
        }
        return value;
    };

    const formValueToAssignments = (value) => {
        return Object.entries(value || {})
            .filter(([, v]) => v?.enabled && v?.project_role)
            .map(([slug, v]) => ({ project_slug: slug, project_role: v.project_role }));
    };

    const handleCreate = () => {
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ project_assignments: {} });
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingUser(record);
        form.setFieldsValue({
            username: record.username,
            name: record.name,
            email: record.email,
            role: record.role,
            project_assignments: assignmentsToFormValue(record.projects),
        });
        setModalVisible(true);
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: '¿Está seguro de eliminar este usuario?',
            content: `Se eliminará el usuario: ${record.name}`,
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await api.delete(`/usuarios/${record.id}`);
                    message.success('Usuario eliminado exitosamente');
                    fetchUsers();
                } catch {
                    message.error('Error al eliminar usuario');
                }
            },
        });
    };

    const handleResetPassword = (record) => {
        const hasPendingReset = record.must_change_password;
        Modal.confirm({
            title: '¿Resetear contraseña?',
            content: (
                <div>
                    <p>Se generará una nueva contraseña temporal para <strong>{record.name}</strong>.</p>
                    <p>El usuario deberá cambiarla en su próximo inicio de sesión.</p>
                    {hasPendingReset && (
                        <p style={{ color: '#d4380d', marginTop: 12 }}>
                            <strong>Atención:</strong> este usuario ya tiene una contraseña temporal pendiente de uso. Si continúas, la anterior dejará de servir y deberás compartir la nueva.
                        </p>
                    )}
                </div>
            ),
            okText: 'Resetear',
            cancelText: 'Cancelar',
            okButtonProps: { danger: hasPendingReset },
            onOk: async () => {
                try {
                    const response = await api.post(`/usuarios/${record.id}/restablecer-contrasena`);
                    fetchUsers();
                    Modal.info({
                        title: 'Contraseña Reseteada',
                        content: (
                            <div>
                                <p>La nueva contraseña temporal es:</p>
                                <Title level={4} copyable>{response.data.temp_password}</Title>
                                <p>Esta contraseña solo se mostrará una vez. Cópiala y compártela con el usuario antes de cerrar.</p>
                            </div>
                        ),
                        width: isMobile ? '100%' : 400,
                        centered: true,
                    });
                } catch {
                    message.error('Error al resetear contraseña');
                }
            },
        });
    };

    const handleSubmit = async (values) => {
        const payload = {
            username: values.username,
            name: values.name,
            email: values.email,
            role: values.role,
        };
        if (values.role === 'editora' || values.role === 'externo') {
            payload.project_assignments = formValueToAssignments(values.project_assignments);
        } else {
            payload.project_assignments = [];
        }

        try {
            if (editingUser) {
                await api.put(`/usuarios/${editingUser.id}`, payload);
                message.success('Usuario actualizado exitosamente');
            } else {
                payload.password = values.password;
                await api.post('/usuarios', payload);
                message.success('Usuario creado exitosamente');
            }
            setModalVisible(false);
            fetchUsers();
        } catch {
            message.error(editingUser ? 'Error al actualizar usuario' : 'Error al crear usuario');
        }
    };

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter((u) => {
            if (roleFilter && u.role !== roleFilter) return false;
            if (!q) return true;
            return (
                u.username?.toLowerCase().includes(q) ||
                u.name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
            );
        });
    }, [users, search, roleFilter]);

    const paginatedUsers = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredUsers.slice(start, start + PAGE_SIZE);
    }, [filteredUsers, page]);

    useEffect(() => { setPage(1); }, [search, roleFilter]);

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
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Administración de Usuarios</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} block={isMobile}>
                    Nuevo Usuario
                </Button>
            </div>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={14}>
                    <Input
                        allowClear
                        placeholder="Buscar por usuario, nombre o email"
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </Col>
                <Col xs={24} sm={12} md={10}>
                    <Select
                        allowClear
                        placeholder="Filtrar por rol"
                        value={roleFilter || undefined}
                        onChange={(v) => setRoleFilter(v || '')}
                        style={{ width: '100%' }}
                        options={Object.keys(roleLabels).map((k) => ({ value: k, label: roleLabels[k] }))}
                    />
                </Col>
            </Row>

            {loading ? (
                <Row gutter={[12, 12]}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Col key={i} xs={24} sm={12} lg={8} xl={6}>
                            <Card><Skeleton avatar paragraph={{ rows: 2 }} active /></Card>
                        </Col>
                    ))}
                </Row>
            ) : filteredUsers.length === 0 ? (
                <Card>
                    <Empty description={users.length === 0
                        ? 'No hay usuarios registrados'
                        : 'Sin resultados con los filtros actuales'} />
                </Card>
            ) : (
                <>
                    <Row gutter={[12, 12]}>
                        {paginatedUsers.map((u) => (
                            <Col key={u.id} xs={24} sm={12} lg={8} xl={6}>
                                <UserCard
                                    user={u}
                                    isSelf={currentUser?.id === u.id}
                                    onEdit={() => handleEdit(u)}
                                    onResetPassword={() => handleResetPassword(u)}
                                    onDelete={() => handleDelete(u)}
                                />
                            </Col>
                        ))}
                    </Row>
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                        <Pagination
                            current={page}
                            pageSize={PAGE_SIZE}
                            total={filteredUsers.length}
                            onChange={setPage}
                            showSizeChanger={false}
                            showTotal={(total) => `Mostrando ${total} de ${users.length} usuarios`}
                            simple={isMobile}
                        />
                    </div>
                </>
            )}

            <Modal
                title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                okText={editingUser ? 'Actualizar' : 'Crear'}
                cancelText="Cancelar"
                width={isMobile ? '100%' : 560}
                centered={isMobile}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item label="Usuario" name="username" rules={[{ required: true, message: 'Por favor ingrese el usuario' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Nombre" name="name" rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Por favor ingrese el email' },
                            { type: 'email', message: 'Email no válido' },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label="Rol" name="role" rules={[{ required: true, message: 'Por favor seleccione el rol' }]}>
                        <Select>
                            <Select.Option value="tetlamamakani">Administradora (acceso global)</Select.Option>
                            <Select.Option value="editora">Editora (staff IIEG)</Select.Option>
                            <Select.Option value="externo">Externo (dependencia)</Select.Option>
                        </Select>
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item label="Contraseña" name="password" rules={[{ required: true, message: 'Por favor ingrese la contraseña' }]}>
                            <Input.Password />
                        </Form.Item>
                    )}

                    {(selectedRole === 'editora' || selectedRole === 'externo') && projects.length > 0 && (
                        <>
                            <Divider orientation="left" style={{ marginTop: 8 }}>Proyectos y roles</Divider>
                            {projects.map((project) => {
                                const enabled = projectAssignments?.[project.slug]?.enabled;
                                return (
                                    <Row key={project.slug} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                                        <Col span={10}>
                                            <Form.Item
                                                name={['project_assignments', project.slug, 'enabled']}
                                                valuePropName="checked"
                                                noStyle
                                            >
                                                <Checkbox>{project.name}</Checkbox>
                                            </Form.Item>
                                        </Col>
                                        <Col span={14}>
                                            <Form.Item
                                                name={['project_assignments', project.slug, 'project_role']}
                                                noStyle
                                                initialValue={enabled ? 'editor' : undefined}
                                            >
                                                <Select
                                                    placeholder="Rol en el proyecto"
                                                    disabled={!enabled}
                                                    allowClear={false}
                                                >
                                                    <Select.Option value="editor">Editor</Select.Option>
                                                    <Select.Option value="viewer">Viewer (solo preview)</Select.Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                );
                            })}
                        </>
                    )}

                    {selectedRole === 'tetlamamakani' && (
                        <div style={{
                            padding: 10,
                            background: '#fffbe6',
                            border: '1px solid #ffe58f',
                            borderRadius: 4,
                        }}>
                            Los admins tienen acceso global a todos los proyectos.
                        </div>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
