import { useMemo, useState } from 'react';
import { Button, Segmented, Space, Tooltip } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';

import { useFullscreenHeader } from '@app/fullscreenHeader';
import useIsMobile from '@shared/hooks/useIsMobile';
import MosaicoCamaras from '../components/MosaicoCamaras';
import useCamarasEnVivo from '../hooks/useCamarasEnVivo';
import { CALIDADES } from '../constants/calidades';

const VIVO_PATH = '/frames/vivo';

const REJILLAS = [
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
];

const VivoPantallaPage = () => {
    const isMobile = useIsMobile();
    const [alto, setAlto] = useState(360);
    const [porFila, setPorFila] = useState(3);
    const { camaras, estados, cargando, error, version, cargar } = useCamarasEnVivo();

    const extra = useMemo(() => (
        <Space wrap>
            <Segmented options={REJILLAS} value={porFila} onChange={setPorFila} size="small" />
            <Segmented options={CALIDADES} value={alto} onChange={setAlto} size="small" />
            <Button size="small" icon={<ReloadOutlined />} onClick={cargar} loading={cargando}>
                Actualizar
            </Button>
            {error ? (
                <Tooltip title={error} trigger={['hover', 'focus']}>
                    <ExclamationCircleOutlined
                        tabIndex={0}
                        aria-label={error}
                        style={{ color: SEMANTIC.warning, cursor: 'help' }}
                    />
                </Tooltip>
            ) : null}
        </Space>
    ), [porFila, alto, cargar, cargando, error]);

    useFullscreenHeader({
        title: isMobile ? 'En vivo' : `Frames · en vivo (${camaras.length})`,
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
