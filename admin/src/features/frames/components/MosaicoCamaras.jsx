import { useEffect, useRef, useState } from 'react';
import { Card, Col, Empty, Row, Tag, Typography } from 'antd';

import { urlFoto } from '../api/framesService';

const { Text } = Typography;

const INTERVALO_MS = 2000;

const FotoCamara = ({ nombre, etiqueta, alto, version }) => {
    const [src, setSrc] = useState('');
    const temporizador = useRef(null);

    useEffect(() => {
        const actual = temporizador;
        setSrc(urlFoto(nombre, { alto, t: Date.now() }));
        return () => clearTimeout(actual.current);
    }, [nombre, alto, version]);

    const programar = () => {
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
            setSrc(urlFoto(nombre, { alto, t: Date.now() }));
        }, INTERVALO_MS);
    };

    return (
        <img
            src={src}
            onLoad={programar}
            onError={programar}
            alt={`Vista de ${etiqueta}`}
            style={{
                width: '100%',
                display: 'block',
                background: '#000',
                aspectRatio: '16 / 9',
                objectFit: 'contain',
            }}
        />
    );
};

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
                );
            })}
        </Row>
    );
};

export default MosaicoCamaras;
