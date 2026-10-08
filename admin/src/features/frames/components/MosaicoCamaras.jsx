import { useNavigate } from 'react-router';
import { Button, Card, Col, Empty, Row, Space, Tag, Tooltip, Typography } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';

import FotoCamara from './FotoCamara';

const { Text } = Typography;

const rutaDe = (nombre) => `/frames/vivo/pantalla/${encodeURIComponent(nombre)}`;

const estadoDe = (estado) => {
    if (!estado) return <Tag>sin datos</Tag>;
    return estado.en_linea
        ? <Tag color="green">{estado.camera_fps} fps</Tag>
        : <Tag color="red">sin señal</Tag>;
};

const MosaicoCamaras = ({ camaras, estados, alto, version, columnas, oscuro }) => {
    const navigate = useNavigate();

    if (camaras.length === 0) {
        return <Empty description="No hay cámaras habilitadas" />;
    }

    const span = columnas || { xs: 24, sm: 12, xl: 8 };

    return (
        <Row gutter={[12, 12]}>
            {camaras.map((camara) => (
                <Col key={camara.id} {...span}>
                    <Card
                        size="small"
                        title={camara.etiqueta}
                        variant={oscuro ? 'borderless' : 'outlined'}
                        styles={oscuro
                            ? { header: { color: '#fff' }, body: { padding: 0 } }
                            : { body: { padding: 8 } }}
                        style={oscuro ? { background: '#141414' } : undefined}
                        extra={
                            <Space size={4}>
                                {estadoDe(estados[camara.nombre])}
                                <Tooltip title="Ver en grande">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<ExpandOutlined />}
                                        aria-label={`Ver ${camara.etiqueta} en grande`}
                                        style={oscuro ? { color: '#fff' } : undefined}
                                        onClick={() => navigate(rutaDe(camara.nombre))}
                                    />
                                </Tooltip>
                            </Space>
                        }
                    >
                        <FotoCamara
                            nombre={camara.nombre}
                            etiqueta={camara.etiqueta}
                            alto={alto}
                            version={version}
                        />
                        {camara.ubicacion && !oscuro
                            ? <Text type="secondary">{camara.ubicacion}</Text>
                            : null}
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default MosaicoCamaras;
