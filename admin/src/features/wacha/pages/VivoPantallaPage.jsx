import { useMemo, useState } from 'react';
import { Alert, Button, Segmented, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { useFullscreenHeader } from '@app/fullscreenHeader';
import useIsMobile from '@shared/hooks/useIsMobile';
import MosaicoCamaras from '../components/MosaicoCamaras';
import useCamarasEnVivo from '../hooks/useCamarasEnVivo';
import { CALIDADES } from '../constants/calidades';

const VIVO_PATH = '/wacha/vivo';

const REJILLAS = [
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
];

const VivoPantallaPage = () => {
    const isMobile = useIsMobile();
    const [alto, setAlto] = useState(360);
    const [porFila, setPorFila] = useState(3);
    const { camaras, estados, cargando, error, version, cargar, recargarVideo } = useCamarasEnVivo();

    const extra = useMemo(() => (
        <Space wrap>
            <Segmented options={REJILLAS} value={porFila} onChange={setPorFila} size="small" />
            <Segmented options={CALIDADES} value={alto} onChange={setAlto} size="small" />
            <Button size="small" icon={<ReloadOutlined />} onClick={cargar} loading={cargando}>
                Actualizar
            </Button>
            <Button size="small" onClick={recargarVideo}>Reiniciar video</Button>
        </Space>
    ), [porFila, alto, cargar, cargando, recargarVideo]);

    useFullscreenHeader({
        title: isMobile ? 'En vivo' : `Wacha · en vivo (${camaras.length})`,
        backTo: VIVO_PATH,
        extra,
    });

    const columnas = useMemo(() => ({
        xs: 24,
        sm: 12,
        md: Math.floor(24 / Math.min(porFila, 2)),
        lg: Math.floor(24 / porFila),
    }), [porFila]);

    return (
        <div style={{ height: '100%', overflow: 'auto', background: '#000', padding: 12 }}>
            {error ? (
                <Alert type="warning" showIcon message={error} style={{ marginBottom: 12 }} />
            ) : null}
            <MosaicoCamaras
                camaras={camaras}
                estados={estados}
                alto={alto}
                version={version}
                columnas={columnas}
                oscuro
            />
        </div>
    );
};

export default VivoPantallaPage;
