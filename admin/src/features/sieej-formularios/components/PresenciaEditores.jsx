import { Avatar, Tag, Tooltip } from 'antd';
import { EyeOutlined, UserOutlined } from '@ant-design/icons';

const SECCION_LABEL = {
    definicion: 'Definición',
    configuracion: 'Configuración',
    asignaciones: 'Asignaciones',
    envios: 'Envíos',
    periodos: 'Periodos',
};

const tituloDe = (editor) => {
    const seccion = SECCION_LABEL[editor.seccion] || editor.seccion;
    return seccion ? `${editor.name} · en ${seccion}` : editor.name;
};

export default function PresenciaEditores({ editores = [], seccionActual, size = 'small' }) {
    if (editores.length === 0) return null;

    const enMiSeccion = seccionActual
        ? editores.filter((e) => e.seccion === seccionActual)
        : [];
    const avatarSize = size === 'small' ? 24 : 32;

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Avatar.Group max={{ count: 4 }} size={avatarSize}>
                {editores.map((editor) => (
                    <Tooltip key={editor.username} title={tituloDe(editor)}>
                        <Avatar
                            src={editor.avatar_url || undefined}
                            icon={!editor.avatar_url && <UserOutlined />}
                            style={{
                                backgroundColor: editor.avatar_url ? undefined : '#5C2472',
                                borderColor: enMiSeccion.some((e) => e.username === editor.username)
                                    ? '#fa8c16'
                                    : undefined,
                            }}
                        />
                    </Tooltip>
                ))}
            </Avatar.Group>
            {enMiSeccion.length > 0 ? (
                <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                    {enMiSeccion.length === 1
                        ? `${enMiSeccion[0].name} está editando esta misma sección`
                        : `${enMiSeccion.length} personas están en esta misma sección`}
                </Tag>
            ) : (
                <Tag icon={<EyeOutlined />} style={{ marginInlineEnd: 0 }}>
                    {editores.length === 1 ? 'Alguien más está aquí' : `${editores.length} personas aquí`}
                </Tag>
            )}
        </span>
    );
}
