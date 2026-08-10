import { memo } from 'react';
import { Avatar, Button, Card, Space, Tag, Tooltip, Typography } from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    UserOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ROLE_COLOR = { tetlamamakani: 'red', editora: 'blue', externo: 'green' };
const ROLE_LABEL = { tetlamamakani: 'Administradora', editora: 'Editora', externo: 'Externo' };
const PROJECT_ROLE_LABEL = { editor: 'Editor', viewer: 'Viewer' };

const UserCard = ({ user, onEdit, onDelete, isSelf }) => {
    const stop = (handler) => (e) => {
        e.stopPropagation();
        handler(user);
    };

    const projectsTags = (() => {
        if (user.role === 'tetlamamakani') {
            return <Tag color="gold">Todos los proyectos</Tag>;
        }
        if (!user.projects || user.projects.length === 0) {
            return <Tag>Sin proyectos asignados</Tag>;
        }
        return user.projects.map((p) => (
            <Tag key={p.slug} color={p.project_role === 'editor' ? 'geekblue' : 'default'}>
                {p.name}: {PROJECT_ROLE_LABEL[p.project_role] || p.project_role}
            </Tag>
        ));
    })();

    const actions = [
        <Tooltip key="editar" title="Editar">
            <Button type="text" icon={<EditOutlined />} onClick={stop(onEdit)} aria-label="Editar" />
        </Tooltip>,
        <Tooltip key="eliminar" title={isSelf ? 'No puedes eliminar tu propio usuario' : 'Eliminar'}>
            <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={stop(onDelete)}
                aria-label="Eliminar"
                disabled={isSelf}
            />
        </Tooltip>,
    ];

    return (
        <Card
            hoverable
            onClick={() => onEdit(user)}
            actions={actions}
            styles={{ body: { padding: 16, flex: 1 } }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <Space align="start" size={12} style={{ width: '100%' }}>
                <Avatar
                    size={48}
                    src={user.avatarUrl || user.avatar_url || undefined}
                    icon={!user.avatarUrl && !user.avatar_url && <UserOutlined />}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                    }}>
                        <Title level={5} style={{ margin: 0, lineHeight: 1.3 }} ellipsis={{ rows: 2 }}>
                            {user.name}
                        </Title>
                        <Tag color={ROLE_COLOR[user.role]} style={{ flexShrink: 0, marginInlineEnd: 0 }}>
                            {ROLE_LABEL[user.role] || user.role}
                        </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace', display: 'block' }}>
                        @{user.username}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }} ellipsis>
                        {user.email}
                    </Text>
                </div>
            </Space>
            <Space size={4} wrap style={{ marginTop: 12 }}>
                {projectsTags}
            </Space>
        </Card>
    );
};

export default memo(UserCard);
