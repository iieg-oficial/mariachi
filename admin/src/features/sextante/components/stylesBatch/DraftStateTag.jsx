import { Tag, Tooltip } from 'antd';

const STATES = {
    en_progreso: { color: 'blue', label: 'Borrador' },
    pendiente_revision: { color: 'orange', label: 'En revisión' },
    rechazado: { color: 'red', label: 'Rechazado' },
    aprobado: { color: 'green', label: 'Publicado' },
};

export default function DraftStateTag({ draft }) {
    const state = STATES[draft.estado] || { color: 'default', label: draft.estado };
    const tag = <Tag color={state.color} style={{ marginInlineEnd: 0 }}>{state.label}</Tag>;
    if (draft.estado !== 'rechazado' || !draft.comentario_rechazo) return tag;
    return <Tooltip title={draft.comentario_rechazo}>{tag}</Tooltip>;
}
