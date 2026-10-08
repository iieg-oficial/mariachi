import { Avatar } from 'antd';
import { colorDe, inicialesDe } from '../helpers/avatar';

export default function UserAvatar({ user, size = 48 }) {
    const src = user.avatarUrl || user.avatar_url || undefined;

    if (src) {
        return <Avatar size={size} src={src} alt={user.name} style={{ flexShrink: 0 }} />;
    }

    return (
        <Avatar
            size={size}
            style={{
                flexShrink: 0,
                backgroundColor: colorDe(user.username || user.name || ''),
                fontWeight: 600,
                fontSize: Math.round(size * 0.36),
            }}
        >
            {inicialesDe(user.name)}
        </Avatar>
    );
}
