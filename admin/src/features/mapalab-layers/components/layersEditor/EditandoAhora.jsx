import { Avatar, Space, Tooltip, Typography } from 'antd';
import usePresencia from '@shared/hooks/usePresencia';
import useCampoEnfocado from '@shared/hooks/useCampoEnfocado';
import PresenciaCampos from '@shared/components/PresenciaCampos';
import UserAvatar from '@features/users/components/UserAvatar';

const { Text } = Typography;

const FORMULARIO = '.layer-editor-form';

export default function EditandoAhora({ layerId }) {
    const campo = useCampoEnfocado(FORMULARIO, Boolean(layerId));
    const editores = usePresencia(
        layerId ? `/borradores/layer/${encodeURIComponent(layerId)}` : null,
        Boolean(layerId),
        { campo, salida: true },
    );
    if (!editores.length) return null;
    return (
        <Space size={6}>
            <PresenciaCampos contenedor={FORMULARIO} editores={editores} />
            <Avatar.Group max={{ count: 4 }} size={24}>
                {editores.map((editor) => (
                    <Tooltip
                        key={editor.username}
                        title={editor.campo ? `${editor.name} está escribiendo` : `${editor.name} está en esta capa`}
                    >
                        <span>
                            <UserAvatar user={editor} size={24} />
                        </span>
                    </Tooltip>
                ))}
            </Avatar.Group>
            <Text type="secondary" style={{ fontSize: 11 }}>
                {editores.length === 1 ? 'también está aquí' : 'también están aquí'}
            </Text>
        </Space>
    );
}
