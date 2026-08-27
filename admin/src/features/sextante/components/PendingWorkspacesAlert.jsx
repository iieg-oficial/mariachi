import { useState } from 'react';
import { Alert, Button } from 'antd';
import RegisterWorkspaceModal from './RegisterWorkspaceModal';

export default function PendingWorkspacesAlert({ pending = [], onRegistered }) {
    const [open, setOpen] = useState(false);

    if (!pending.length) return null;

    const description = (
        <span>
            {pending.map((p) => `${p.geoserverWorkspace} (${p.layerCount})`).join(', ')}
            . Sus capas no aparecen abajo hasta que los registres.
        </span>
    );

    return (
        <>
            <Alert
                closable
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                title={`${pending.length} workspace${pending.length === 1 ? '' : 's'} sin registrar en GeoServer`}
                description={description}
                action={
                    <Button size="small" type="primary" onClick={() => setOpen(true)}>
                        Registrar
                    </Button>
                }
            />
            <RegisterWorkspaceModal
                open={open}
                onClose={() => setOpen(false)}
                onRegistered={(ws) => { setOpen(false); onRegistered?.(ws); }}
                pending={pending}
            />
        </>
    );
}
