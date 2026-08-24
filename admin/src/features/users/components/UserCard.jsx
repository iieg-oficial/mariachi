import { memo } from 'react';
import { Card, Space, Tag, Tooltip, Typography } from 'antd';
import UserAvatar from './UserAvatar';
import EstadoCuenta from './EstadoCuenta';
import { formatoFecha } from '../helpers/estadoCuenta';
import { PROJECT_ROLE_LABEL, ROLE_COLOR, roleLabel } from '../constants/roles';

const { Title, Text } = Typography;

export const CARD_MIN_WIDTH = 288;
export const CARD_MAX_WIDTH = 420;
export const CARD_MIN_HEIGHT = 184;

const conteo = (total) => (total === 1 ? '1 proyecto' : `${total} proyectos`);

const ProyectosTag = ({ user, detalleVisible, proyectosDelSistema = [] }) => {
    const esGlobal = user.role === 'tetlamamakani';

    if (!esGlobal && !detalleVisible) return null;

    const proyectos = esGlobal ? proyectosDelSistema : (user.projects || []);
    if (proyectos.length === 0) {
        return <Tag style={{ marginInlineEnd: 0 }}>Sin proyectos</Tag>;
    }

    const detalle = (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
            {proyectos.map((p) => (
                <li key={p.slug}>
                    {p.name}{esGlobal ? '' : `: ${PROJECT_ROLE_LABEL[p.project_role] || p.project_role}`}
                </li>
            ))}
        </ul>
    );

    return (
        <Tooltip title={detalle}>
            <Tag style={{ marginInlineEnd: 0, cursor: 'help' }}>
                {conteo(proyectos.length)}
            </Tag>
        </Tooltip>
    );
};

const UserCard = ({
    user,
    onEdit,
    puedeEditar = true,
    detalleVisible = true,
    proyectosDelSistema = [],
}) => {
    const abrirConTeclado = (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onEdit(user);
    };

    const alta = formatoFecha(user.created_at);
    const ultimaSesion = formatoFecha(user.ultimo_acceso);

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

            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 8,
                }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {alta ? `Alta ${alta}` : ''}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {ultimaSesion ? `Última sesión ${ultimaSesion}` : 'Sin ingresar'}
                    </Text>
                </div>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <Space size={4} wrap>
                        <Tag color={ROLE_COLOR[user.role]} style={{ marginInlineEnd: 0 }}>
                            {roleLabel(user.role)}
                        </Tag>
                        <ProyectosTag
                            user={user}
                            detalleVisible={detalleVisible}
                            proyectosDelSistema={proyectosDelSistema}
                        />
                        {user.sieej_grupo && (
                            <Tag color="purple" style={{ marginInlineEnd: 0 }}>{user.sieej_grupo.nombre}</Tag>
                        )}
                    </Space>
                    <EstadoCuenta user={user} detalleVisible={detalleVisible} />
                </div>
            </div>
        </Card>
    );
};

export default memo(UserCard);
