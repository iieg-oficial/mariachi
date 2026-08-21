import { memo } from 'react';
import { Card, Space, Tag, Tooltip, Typography } from 'antd';
import { SafetyCertificateFilled, SafetyCertificateOutlined } from '@ant-design/icons';
import UserAvatar from './UserAvatar';
import { ROLE_COLOR, roleLabel } from '../constants/roles';

const { Title, Text } = Typography;

export const CARD_MIN_WIDTH = 288;
export const CARD_MAX_WIDTH = 420;
export const CARD_MIN_HEIGHT = 184;

const formatoAlta = (valor) => {
    if (!valor) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime())
        ? null
        : fecha.toLocaleDateString('es-MX', { dateStyle: 'medium' });
};

const resumenProyectos = (user, detalleVisible) => {
    if (user.role === 'tetlamamakani') return 'Todos los proyectos';
    if (!detalleVisible) return null;
    const total = (user.projects || []).length;
    if (total === 0) return 'Sin proyectos';
    return total === 1 ? '1 proyecto' : `${total} proyectos`;
};

const MinervaEstado = ({ vinculado }) => {
    const titulo = vinculado
        ? 'Vinculado a minerva: ya inició sesión'
        : 'Sin vincular a minerva: todavía no inicia sesión';
    const Icono = vinculado ? SafetyCertificateFilled : SafetyCertificateOutlined;

    return (
        <Tooltip title={titulo}>
            <span role="img" aria-label={titulo} style={{ display: 'inline-flex' }}>
                <Icono style={{ fontSize: 16, color: vinculado ? '#389E0D' : '#D48806' }} />
            </span>
        </Tooltip>
    );
};

const UserCard = ({ user, onEdit, puedeEditar = true, detalleVisible = true }) => {
    const abrirConTeclado = (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onEdit(user);
    };

    const alta = formatoAlta(user.created_at);
    const proyectos = resumenProyectos(user, detalleVisible);

    return (
        <Card
            hoverable={puedeEditar}
            onClick={puedeEditar ? () => onEdit(user) : undefined}
            styles={{ body: { padding: 16, flex: 1, display: 'flex', flexDirection: 'column' } }}
            style={{
                height: '100%',
                width: '100%',
                minHeight: CARD_MIN_HEIGHT,
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
                    <UserAvatar user={user} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Title level={5} style={{ margin: 0, lineHeight: 1.3 }} ellipsis={{ rows: 2 }}>
                            {user.name}
                        </Title>
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
                <Tag color={ROLE_COLOR[user.role]} style={{ marginInlineEnd: 0 }}>
                    {roleLabel(user.role)}
                </Tag>
                {proyectos && <Tag style={{ marginInlineEnd: 0 }}>{proyectos}</Tag>}
                {user.sieej_grupo && (
                    <Tag color="purple" style={{ marginInlineEnd: 0 }}>{user.sieej_grupo.nombre}</Tag>
                )}
            </Space>

            <div style={{
                marginTop: 'auto',
                paddingTop: 12,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
            }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                    {alta ? `Alta ${alta}` : ''}
                </Text>
                <MinervaEstado vinculado={Boolean(user.minerva_vinculado)} />
            </div>
        </Card>
    );
};

export default memo(UserCard);
