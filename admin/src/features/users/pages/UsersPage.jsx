import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Col, Empty, Form, Input, Modal, Row, Select, Skeleton, Typography, Button, Pagination } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import api from '@shared/services/api';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import UserCard from '../components/UserCard';
import UserFormModal from '../components/UserFormModal';
import { allowedSlugsForRole } from '../constants/projectAccess';

const { Title } = Typography;

const roleLabels = {
    tetlamamakani: 'Administradora',
    editora: 'Editora',
    externo: 'Externo',
};

const PAGE_SIZE = 12;

const FIELD_LABEL = {
    username: 'Usuario',
    name: 'Nombre',
    email: 'Email',
    password: 'Contraseña',
    role: 'Rol',
    project_assignments: 'Proyectos',
};

const formatBackendError = (error, fallback) => {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) {
        const lines = detail.map((d) => {
            const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
            const label = FIELD_LABEL[field] || field || 'campo';
            return `${label}: ${d.msg}`;
        });
        return lines.join(' · ');
    }
    if (typeof detail === 'string') return detail;
    return fallback;
};

export default function Users() {
    const { isMobile } = useIsMobile();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();
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

    useEffect(() => {
        let cancelled = false;
        api.get('/sieej/grupos')
            .then((r) => { if (!cancelled) setGrupos(r.data); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const buildAssignmentsValue = (projectsList, userProjects) => {
        const assigned = new Map((userProjects || []).map((p) => [p.slug, p.project_role]));
        const value = {};
        for (const p of projectsList || []) {
            value[p.slug] = {
                enabled: assigned.has(p.slug),
                project_role: assigned.get(p.slug) || 'editor',
            };
        }
        return value;
    };

    const formValueToAssignments = (value) => {
        return Object.entries(value || {})
            .filter(([, v]) => v?.enabled)
            .map(([slug, v]) => ({ project_slug: slug, project_role: v?.project_role || 'editor' }));
    };

    const handleCreate = useCallback(() => {
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ project_assignments: buildAssignmentsValue(projects, []) });
        setModalVisible(true);
    }, [form, projects]);

    const handleEdit = useCallback((record) => {
        setEditingUser(record);
        form.resetFields();
        form.setFieldsValue({
            username: record.username,
            name: record.name,
            email: record.email,
            role: record.role,
            project_assignments: buildAssignmentsValue(projects, record.projects),
            sieej_grupo_id: record.sieej_grupo?.id,
            sieej_grupo_nombre: undefined,
        });
        setModalVisible(true);
    }, [form, projects]);

    const handleDelete = useCallback((record) => {
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
    }, [fetchUsers]);

    const handleResetPassword = useCallback((record) => {
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
    }, [fetchUsers, isMobile]);

    const handleSubmit = useCallback(async (values) => {
        const payload = {
            username: values.username,
            name: values.name,
            email: values.email,
            role: values.role,
        };
        if (values.role === 'editora' || values.role === 'externo') {
            const allowed = new Set(allowedSlugsForRole(values.role, projects));
            const scoped = Object.fromEntries(
                Object.entries(values.project_assignments || {}).filter(([slug]) => allowed.has(slug)),
            );
            payload.project_assignments = formValueToAssignments(scoped);
        } else {
            payload.project_assignments = [];
        }

        if (values.role === 'externo') {
            payload.sieej_grupo_id = values.sieej_grupo_id ?? null;
            payload.sieej_grupo_nombre = values.sieej_grupo_nombre ?? null;
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
        } catch (error) {
            const fallback = editingUser ? 'Error al actualizar usuario' : 'Error al crear usuario';
            message.error(formatBackendError(error, fallback));
        }
    }, [editingUser, fetchUsers, projects]);

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
                                    onEdit={handleEdit}
                                    onResetPassword={handleResetPassword}
                                    onDelete={handleDelete}
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

            <UserFormModal
                open={modalVisible}
                editingUser={editingUser}
                projects={projects}
                grupos={grupos}
                isMobile={isMobile}
                form={form}
                onCancel={() => setModalVisible(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
