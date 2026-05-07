import { message } from '@shared/services/message';
import api from '@shared/services/api';

function deriveLabel(geoserverWorkspace) {
    if (!geoserverWorkspace) return '';
    return geoserverWorkspace
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function addCapaToEvento(leaf, currentValue, onChange, onAfterRegister) {
    let alias = leaf.workspace;
    if (!leaf.workspaceRegistered) {
        const gsName = leaf.geoserverWorkspace;
        try {
            await api.post('/geoserver/workspaces/register', {
                geoserver_workspace: gsName,
                alias: gsName,
                db_schema: gsName,
                label: deriveLabel(gsName),
            });
            message.success(`Workspace "${gsName}" registrado automaticamente`);
            alias = gsName;
            onAfterRegister?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo registrar el workspace');
            return false;
        }
    }
    if (!leaf.registered) {
        try {
            await api.post('/layers/auto-leaf', {
                workspace_alias: alias,
                geoserver_layer: leaf.layer,
                label: leaf.label,
            });
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo registrar la capa en el arbol');
            return false;
        }
    }
    onChange?.([
        ...currentValue,
        {
            tipo: 'capa',
            workspace: alias,
            layer: leaf.layer,
            alias: leaf.label,
            orden: currentValue.length,
            autoActivar: true,
        },
    ]);
    message.success(`"${leaf.label}" agregada`);
    return true;
}
