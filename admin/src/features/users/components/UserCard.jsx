import { memo } from 'react';
import { Avatar, Button, Card, Space, Tag, Tooltip, Typography } from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { PROJECT_ROLE_LABEL, ROLE_COLOR, roleLabel } from '../constants/roles';

const { Title, Text } = Typography;

export const CARD_MIN_WIDTH = 288;
export const CARD_MAX_WIDTH = 420;

const formatoAlta = (valor) => {
    if (!valor) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime())
        ? null
        : fecha.toLocaleDateString('es-MX', { dateStyle: 'medium' });
};

const UserCard = ({
    user,
    onEdit,
    onDelete,
    isSelf,
    puedeEditar = true,
    puedeEliminar = true,
    detalleVisible = true,
}) => {
    const stop = (handler) => (e) => {
        e.stopPropagation();
        handler(user);
    };

    const proyectosTags = (() => {
        if (user.role === 'tetlamamakani') {
            return <Tag color="gold">Todos los proyectos</Tag>;
        }
        if (!detalleVisible) return null;
        if (!user.projects || user.projects.length === 0) {
            return <Tag>Sin proyectos asignados</Tag>;
        }
        return user.projects.map((p) => (
            <Tag key={p.slug} color={p.project_role === 'editor' ? 'geekblue' : 'default'}>
                {p.name}: {PROJECT_ROLE_LABEL[p.project_role] || p.project_role}
            </Tag>
        ));
    })();

    const actions = [];
    if (puedeEditar) {
        actions.push(
            <Tooltip key="editar" title="Editar">
                <Button type="text" icon={<EditOutlined />} onClick={stop(onEdit)} aria-label="Editar" />
            </Tooltip>,
        );
    }
    if (puedeEliminar) {
        actions.push(
            <Tooltip key="eliminar" title={isSelf ? 'No puedes eliminar tu propio usuario' : 'Eliminar'}>
                <span style={{ display: 'inline-block' }}>
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={stop(onDelete)}
                        aria-label="Eliminar"
                        disabled={isSelf}
                    />
                </span>
            </Tooltip>,
        );
    }

    const abrirConTeclado = (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onEdit(user);
    };

    const alta = formatoAlta(user.created_at);

    return (
        <Card
            hoverable={puedeEditar}
            onClick={puedeEditar ? () => onEdit(user) : undefined}
            actions={actions.length > 0 ? actions : undefined}
            styles={{ body: { padding: 16, flex: 1 } }}
            style={{
                height: '100%',
                width: '100%',
                maxWidth: CARD_MAX_WIDTH,
                marginInline: 'auto',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                role={puedeEditar ? 'button' : undefined}
                tabIndex={puedeEditar ? 0 : undefined}
                onKeyDown={puedeEditar ? abrirConTeclado : undefined}
                aria-label={puedeEditar ? `Editar ${user.name}` : undefined}
                style={{ outlineOffset: 4 }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Avatar
                        size={48}
                        src={user.avatarUrl || user.avatar_url || undefined}
                        icon={!user.avatarUrl && !user.avatar_url && <UserOutlined />}
                        style={{ flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 8,
                        }}>
                            <Title
                                level={5}
                                style={{ margin: 0, lineHeight: 1.3, flex: '1 1 120px', minWidth: 0 }}
                                ellipsis={{ rows: 2 }}
                            >
                                {user.name}
                            </Title>
                            <Tag color={ROLE_COLOR[user.role]} style={{ flexShrink: 0, marginInlineEnd: 0 }}>
                                {roleLabel(user.role)}
                            </Tag>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace', display: 'block' }} ellipsis>
                            @{user.username}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }} ellipsis>
                            {user.email}
                        </Text>
                    </div>
                </div>
            </div>
            <Space size={4} wrap style={{ marginTop: 12 }}>
                {proyectosTags}
                {user.sieej_grupo && <Tag color="purple">{user.sieej_grupo.nombre}</Tag>}
            </Space>
            <div style={{
                marginTop: 12,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
            }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                    {alta ? `Alta ${alta}` : ''}
                </Text>
                <Tooltip title={user.minerva_vinculado
                    ? 'Ya inició sesión con minerva'
                    : 'Todavía no inicia sesión con minerva: la cuenta no está enlazada'}>
                    <Tag
                        color={user.minerva_vinculado ? 'success' : 'warning'}
                        icon={<SafetyCertificateOutlined />}
                        style={{ marginInlineEnd: 0, fontSize: 11 }}
                    >
                        {user.minerva_vinculado ? 'Minerva' : 'Sin vincular'}
                    </Tag>
                </Tooltip>
            </div>
        </Card>
    );
};

export default memo(UserCard);
