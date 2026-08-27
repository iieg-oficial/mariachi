import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Button, Segmented, Space, Typography } from 'antd';
import { ExpandOutlined, ReloadOutlined } from '@ant-design/icons';

import { CALIDADES } from '../constants/calidades';
import MosaicoCamaras from '../components/MosaicoCamaras';
import useCamarasEnVivo from '../hooks/useCamarasEnVivo';

const { Title, Paragraph } = Typography;

const VivoPage = () => {
    const navigate = useNavigate();
    const [alto, setAlto] = useState(360);
    const { camaras, estados, cargando, error, version, cargar, recargarVideo } = useCamarasEnVivo();

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>En vivo</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Lo que están transmitiendo las cámaras habilitadas. El video pasa por mariachi,
                    así que no hace falta alcanzar a wacha desde el navegador.
                </Paragraph>
            </div>

            {error ? <Alert type="warning" showIcon title={error} /> : null}

            <Space wrap>
                <Button type="primary" icon={<ExpandOutlined />} onClick={() => navigate('/wacha/vivo/pantalla')}>
                    Pantalla completa
                </Button>
                <Button icon={<ReloadOutlined />} onClick={cargar} loading={cargando}>
                    Actualizar lista
                </Button>
                <Button onClick={recargarVideo}>Reiniciar video</Button>
                <Segmented options={CALIDADES} value={alto} onChange={setAlto} />
            </Space>

            <MosaicoCamaras
                camaras={camaras}
                estados={estados}
                alto={alto}
                version={version}
            />
        </Space>
    );
};

export default VivoPage;
