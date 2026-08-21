import { useCallback, useState } from 'react';
import { Button, Card, Empty, Form, Modal, Pagination, Skeleton } from 'antd';
import { PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import PageHeading from '@shared/components/PageHeading';
import api from '@shared/services/api';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import UserCard, { CARD_MAX_WIDTH, CARD_MIN_WIDTH } from '../components/UserCard';
import UserFormModal from '../components/UserFormModal';
import UsersFilters from '../components/UsersFilters';
import ImpactoEliminacion from '../components/ImpactoEliminacion';
import useUsuarios from '../hooks/useUsuarios';
import useFiltroUsuarios, { PAGE_SIZE } from '../hooks/useFiltroUsuarios';
import { allowedSlugsForRole } from '../constants/projectAccess';

const FIELD_LABEL = {
    username: 'Usuario',
    name: 'Nombre',
    email: 'Email',
    role: 'Rol',
    project_assignments: 'Proyectos',
};

const GRID_STYLE = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(min(${CARD_MIN_WIDTH}px, 100%), 1fr))`,
    gap: 12,
};

const SKELETON_STYLE = { width: '100%', maxWidth: CARD_MAX_WIDTH, marginInline: 'auto' };

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

const formValueToAssignments = (value) => Object.entries(value || {})
    .filter(([, v]) => v?.enabled)
    .map(([slug, v]) => ({ project_slug: slug, project_role: v?.project_role || 'editor' }));

export default function Users() {
    const { isMobile } = useIsMobile();
    const { user: currentUser, can } = useAuth();
    const puedeCrear = can('mariachi.usuarios.create');
    const puedeGestionar = can('mariachi.usuarios.update');
    const puedeAsignar = can('mariachi.usuarios.assign');
    const puedeEliminar = can('mariachi.usuarios.delete');

    const { usuarios, proyectos, grupos, cargando, recargar, cargarGrupos } = useUsuarios();
    const filtro = useFiltroUsuarios(usuarios);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    const handleCreate = useCallback(() => {
        cargarGrupos();
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ project_assignments: buildAssignmentsValue(proyectos, []) });
        setModalVisible(true);
    }, [cargarGrupos, form, proyectos]);

    const handleEdit = useCallback((record) => {
        cargarGrupos();
        setEditingUser(record);
        form.resetFields();
        form.setFieldsValue({
            username: record.username,
            name: record.name,
            email: record.email,
            role: record.role,
            project_assignments: buildAssignmentsValue(proyectos, record.projects),
            sieej_grupo_id: record.sieej_grupo?.id,
            sieej_grupo_nombre: undefined,
        });
        setModalVisible(true);
    }, [cargarGrupos, form, proyectos]);

    const handleDelete = useCallback(async (record) => {
        let impacto;
        try {
            const { data } = await api.get(`/usuarios/${record.id}/impacto-eliminacion`);
            impacto = data;
        } catch {
            impacto = null;
        }

        if (impacto?.bloqueado) {
            Modal.error({
                title: 'No se puede eliminar',
                content: `${record.name} es autor de ${impacto.formularios_creados} formulario(s) de SIEEJ. Transfiere la autoría o archívalos antes de eliminar la cuenta.`,
            });
            return;
        }

        Modal.confirm({
            title: '¿Está seguro de eliminar este usuario?',
            content: <ImpactoEliminacion usuario={record} impacto={impacto} />,
            width: 520,
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await api.delete(`/usuarios/${record.id}`);
                    message.success('Usuario eliminado exitosamente');
                    setModalVisible(false);
                    recargar();
                } catch (error) {
                    message.error(formatBackendError(error, 'Error al eliminar usuario'));
                }
            },
        });
    }, [recargar]);

    const handleSubmit = useCallback(async (values) => {
        const payload = {
            username: values.username,
            name: values.name,
            email: values.email,
            role: values.role,
        };

        if (puedeAsignar) {
            if (values.role === 'editora' || values.role === 'externo') {
                const allowed = new Set(allowedSlugsForRole(values.role, proyectos));
                const scoped = Object.fromEntries(
                    Object.entries(values.project_assignments || {}).filter(([slug]) => allowed.has(slug)),
                );
                payload.project_assignments = formValueToAssignments(scoped);
            } else {
                payload.project_assignments = [];
            }
        }

        if (puedeAsignar && values.role === 'externo') {
            payload.sieej_grupo_id = values.sieej_grupo_id ?? null;
            payload.sieej_grupo_nombre = values.sieej_grupo_nombre ?? null;
        }

        try {
            if (editingUser) {
                await api.put(`/usuarios/${editingUser.id}`, payload);
                message.success('Usuario actualizado exitosamente');
            } else {
                await api.post('/usuarios', payload);
                message.success('Usuario creado exitosamente');
            }
            setModalVisible(false);
            recargar();
        } catch (error) {
            const fallback = editingUser ? 'Error al actualizar usuario' : 'Error al crear usuario';
            message.error(formatBackendError(error, fallback));
        }
    }, [editingUser, proyectos, puedeAsignar, recargar]);

    const sinUsuarios = usuarios.length === 0;

    return (
        <div>
            <PageHeading
                icon={<TeamOutlined />}
                title="Administración de Usuarios"
                description="Altas, roles y accesos por proyecto de las personas que usan Mariachi."
                level={isMobile ? 3 : 2}
                extra={puedeCrear ? (
                    <div style={{ width: isMobile ? '100%' : 'auto' }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} block={isMobile}>
                            Nuevo Usuario
                        </Button>
                    </div>
                ) : undefined}
            />

            <UsersFilters
                filtros={filtro.filtros}
                onBusqueda={filtro.setBusqueda}
                onRol={filtro.setRol}
                onProyecto={filtro.setProyecto}
                onOrden={filtro.setOrden}
                proyectos={proyectos}
                mostrarProyecto={puedeGestionar}
            />

            {cargando ? (
                <div style={GRID_STYLE}>
                    {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                        <Card key={i} style={SKELETON_STYLE}><Skeleton avatar paragraph={{ rows: 2 }} active /></Card>
                    ))}
                </div>
            ) : filtro.total === 0 ? (
                <Card>
                    <Empty description={sinUsuarios
                        ? 'No hay usuarios registrados'
                        : 'Sin resultados con los filtros actuales'} />
                </Card>
            ) : (
                <>
                    <div style={GRID_STYLE}>
                        {filtro.visibles.map((u) => (
                            <UserCard
                                key={u.id}
                                user={u}
                                onEdit={handleEdit}
                                puedeEditar={puedeGestionar}
                                detalleVisible={puedeGestionar || currentUser?.id === u.id}
                            />
                        ))}
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                        <Pagination
                            current={filtro.pagina}
                            pageSize={PAGE_SIZE}
                            total={filtro.total}
                            onChange={filtro.setPagina}
                            showSizeChanger={false}
                            showTotal={(total) => `Mostrando ${total} de ${usuarios.length} usuarios`}
                            simple={isMobile}
                        />
                    </div>
                </>
            )}

            <UserFormModal
                open={modalVisible}
                editingUser={editingUser}
                projects={proyectos}
                grupos={grupos}
                isMobile={isMobile}
                form={form}
                puedeAsignar={puedeAsignar}
                puedeEliminar={puedeEliminar}
                esPropio={currentUser?.id === editingUser?.id}
                onDelete={handleDelete}
                onCancel={() => setModalVisible(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
