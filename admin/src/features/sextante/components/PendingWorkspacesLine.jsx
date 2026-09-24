import { useState } from 'react';
import { Button, Space, Tag, Typography } from 'antd';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import RegisterWorkspaceModal from './RegisterWorkspaceModal';

const { Text } = Typography;

export default function PendingWorkspacesLine({ pending = [], onRegistered }) {
    const [open, setOpen] = useState(false);

    if (!pending.length) return null;

    const detalle = pending.map((p) => `${p.geoserverWorkspace} (${p.layerCount})`).join(', ');
    const plural = pending.length === 1 ? '' : 's';

    return (
        <>
            <Space size={6} wrap>
                <Tag bordered={false} color="orange">
                    {pending.length} workspace{plural} sin registrar
                </Tag>
                <InfoIcon title={`${detalle}. Sus capas no aparecen en el buscador hasta que los registres.`} />
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setOpen(true)}>
                    Registrar
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>para que sus capas aparezcan abajo</Text>
            </Space>
            <RegisterWorkspaceModal
                open={open}
                onClose={() => setOpen(false)}
                onRegistered={(ws) => { setOpen(false); onRegistered?.(ws); }}
                pending={pending}
            />
        </>
    );
}
