import { useState } from 'react';
import { Button, Modal, Typography } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { resetGeoserver } from '@features/sextante/api/mosaicService';
import { message } from '@shared/services/message';

const { Paragraph } = Typography;

export default function ResetCachesButton() {
    const [busy, setBusy] = useState(false);

    const confirmar = () => {
        Modal.confirm({
            title: 'Vaciar cachés de GeoServer',
            content: (
                <Paragraph style={{ marginBottom: 0 }}>
                    Vacía las cachés en memoria de GeoServer: readers, estilos y esquemas se releen del
                    disco. No borra nada, pero las primeras peticiones después van más lentas.
                </Paragraph>
            ),
            okText: 'Vaciar',
            cancelText: 'Cancelar',
            onOk: async () => {
                setBusy(true);
                try {
                    await resetGeoserver();
                    message.success('Cachés de GeoServer vaciadas');
                } catch (err) {
                    message.error(err?.response?.data?.detail || 'No se pudieron vaciar las cachés');
                } finally {
                    setBusy(false);
                }
            },
        });
    };

    return (
        <Button icon={<ClearOutlined />} loading={busy} onClick={confirmar}>
            Vaciar cachés
        </Button>
    );
}
