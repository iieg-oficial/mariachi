import { Card, Col, Empty, Row, Tag, Typography } from 'antd';

import { urlStream } from '../api/wachaService';

const { Text } = Typography;

const MosaicoCamaras = ({ camaras, estados, alto, version, columnas, oscuro }) => {
    if (camaras.length === 0) {
        return <Empty description="No hay cámaras habilitadas" />;
    }

    const span = columnas || { xs: 24, sm: 12, xl: 8 };

    return (
        <Row gutter={[12, 12]}>
            {camaras.map((camara) => {
                const estado = estados[camara.nombre];
                return (
                    <Col key={camara.id} {...span}>
                        <Card
                            size="small"
                            title={camara.etiqueta}
                            variant={oscuro ? 'borderless' : 'outlined'}
                            styles={oscuro
                                ? { header: { color: '#fff' }, body: { padding: 0 } }
                                : { body: { padding: 8 } }}
                            style={oscuro ? { background: '#141414' } : undefined}
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
                            {camara.ubicacion && !oscuro
                                ? <Text type="secondary">{camara.ubicacion}</Text>
                                : null}
                        </Card>
                    </Col>
                );
            })}
        </Row>
    );
};

export default MosaicoCamaras;
