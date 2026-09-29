import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, ConfigProvider, Segmented, Space } from 'antd';
import {
    ExclamationCircleOutlined,
    ExpandOutlined,
    ReloadOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import { SEMANTIC } from '@app/providers/brand';

import { CALIDADES } from '../constants/calidades';
import { TEMA_FRAMES } from '../constants/tema';
import MosaicoCamaras from '../components/MosaicoCamaras';
import Senal from '../components/Senal';
import useCamarasEnVivo from '../hooks/useCamarasEnVivo';

const DESCRIPCION = 'Lo que están viendo las cámaras habilitadas. La imagen pasa por mariachi, '
    + 'así que no hace falta alcanzar a frames desde el navegador.';

const VivoPage = () => {
    const navigate = useNavigate();
    const [alto, setAlto] = useState(360);
    const { camaras, estados, cargando, error, version, cargar } = useCamarasEnVivo();

    return (
        <ConfigProvider theme={TEMA_FRAMES}>
            <PageHeading
                icon={<VideoCameraOutlined />}
                title="En vivo"
                description={DESCRIPCION}
                extra={
                    <Space size={12} wrap>
                        <Button
                            type="primary"
                            icon={<ExpandOutlined />}
                            onClick={() => navigate('/frames/vivo/pantalla')}
                        >
                            Pantalla completa
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={cargar} loading={cargando}>
                            Actualizar
                        </Button>
                        <Segmented options={CALIDADES} value={alto} onChange={setAlto} />
                    </Space>
                }
            />

            {error ? (
                <div style={{ marginBottom: 16 }}>
                    <Senal
                        icono={<ExclamationCircleOutlined />}
                        texto="Sin estado de frames"
                        color={SEMANTIC.warning}
                        ayuda={error}
                    />
                </div>
            ) : null}

            <MosaicoCamaras
                camaras={camaras}
                estados={estados}
                alto={alto}
                version={version}
            />
        </ConfigProvider>
    );
};

export default VivoPage;
