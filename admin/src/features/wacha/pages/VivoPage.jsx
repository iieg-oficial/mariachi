import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Row, Segmented, Space, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { getEstadoCamaras, listCamaras, urlStream } from '../api/wachaService';

const { Title, Paragraph, Text } = Typography;

const CALIDADES = [
    { label: 'Baja', value: 240 },
    { label: 'Media', value: 360 },
    { label: 'Alta', value: 720 },
];

const VivoPage = () => {
    const [camaras, setCamaras] = useState([]);
    const [estados, setEstados] = useState({});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);
    const [alto, setAlto] = useState(360);
    const [version, setVersion] = useState(0);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const lista = await listCamaras();
            setCamaras(lista.filter((c) => c.habilitada));
            try {
                setEstados(await getEstadoCamaras());
                setError(null);
            } catch {
                setEstados({});
                setError('No se pudo consultar el estado en wacha; el video puede no cargar.');
            }
        } catch {
            message.error('No se pudieron cargar las cámaras');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const recargarVideo = () => setVersion((v) => v + 1);

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>En vivo</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Lo que están transmitiendo las cámaras habilitadas. El video pasa por mariachi,
                    así que no hace falta alcanzar a wacha desde el navegador.
                </Paragraph>
            </div>

            {error ? <Alert type="warning" showIcon message={error} /> : null}

            <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={cargar} loading={cargando}>
                    Actualizar lista
                </Button>
                <Button onClick={recargarVideo}>Reiniciar video</Button>
                <Segmented options={CALIDADES} value={alto} onChange={setAlto} />
            </Space>

            {camaras.length === 0 && !cargando ? (
                <Empty description="No hay cámaras habilitadas" />
            ) : (
                <Row gutter={[16, 16]}>
                    {camaras.map((camara) => {
                        const estado = estados[camara.nombre];
                        return (
                            <Col key={camara.id} xs={24} sm={12} xl={8}>
                                <Card
                                    size="small"
                                    title={camara.etiqueta}
                                    extra={estado
                                        ? (estado.en_linea
                                            ? <Tag color="green">{estado.camera_fps} fps</Tag>
                                            : <Tag color="red">sin señal</Tag>)
                                        : <Tag>sin datos</Tag>}
                                >
                                    <img
                                        key={`${camara.nombre}-${version}-${alto}`}
                                        src={urlStream(camara.nombre, { alto })}
                                        alt={`Transmisión de ${camara.etiqueta}`}
                                        style={{
                                            width: '100%',
                                            display: 'block',
                                            background: '#000',
                                            aspectRatio: '16 / 9',
                                            objectFit: 'contain',
                                        }}
                                    />
                                    {camara.ubicacion
                                        ? <Text type="secondary">{camara.ubicacion}</Text>
                                        : null}
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}
        </Space>
    );
};

export default VivoPage;
