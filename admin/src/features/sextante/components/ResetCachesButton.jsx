import { useState } from 'react';
import { Button, Modal, Tooltip, Typography } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { resetGeoserver } from '@features/sextante/api/mosaicService';
import { message } from '@shared/services/message';

const { Paragraph } = Typography;

const QUE_HACE = 'Vacía las cachés en memoria de GeoServer y renueva las leyendas del visor, '
    + 'que el gateway guarda seis horas. No borra archivos; las primeras peticiones después van más lentas.';

export default function ResetCachesButton() {
    const [busy, setBusy] = useState(false);

    const confirmar = () => {
        Modal.confirm({
            title: 'Vaciar cachés de GeoServer',
            content: (
                <Paragraph style={{ marginBottom: 0 }}>{QUE_HACE}</Paragraph>
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
        <Tooltip title={QUE_HACE}>
            <Button icon={<ClearOutlined />} loading={busy} onClick={confirmar}>
                Vaciar cachés
            </Button>
        </Tooltip>
    );
}
