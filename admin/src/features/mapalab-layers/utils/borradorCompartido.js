import api from '@shared/services/api';
import { message } from '@shared/services/message';

const versiones = new Map();
const clave = (tipo, id) => `${tipo}::${id}`;

export const versionDe = (tipo, id) => versiones.get(clave(tipo, id)) ?? null;

export function recordarVersiones(borradores) {
    (borradores || []).forEach((b) => {
        if (b?.version) versiones.set(clave(b.resource_type, b.resource_id), b.version);
    });
}

export function autorDeCampo(borrador, campo) {
    const autor = borrador?.autores?.[campo];
    return autor?.nombre || autor?.usuario || borrador?.usuario?.name || null;
}

export async function guardarBorradorCompartido(tipo, id, data, { quitar = [] } = {}) {
    try {
        const res = await api.put(`/borradores/${tipo}/${encodeURIComponent(id)}`, {
            data,
            quitar,
            base_version: versionDe(tipo, id),
        });
        if (res.data?.version) versiones.set(clave(tipo, id), res.data.version);
        else versiones.delete(clave(tipo, id));
        return res.data;
    } catch (err) {
        if (err?.response?.status === 409) {
            message.warning({ content: err.response.data?.detail || 'Otra persona cambió este campo', key: `choque-${clave(tipo, id)}` });
        }
        throw err;
    }
}

export async function quitarCamposDeBorrador(borradorId, campos) {
    const res = await api.post(`/borradores/por-id/${borradorId}/quitar-campos`, { campos });
    return res.data;
}
