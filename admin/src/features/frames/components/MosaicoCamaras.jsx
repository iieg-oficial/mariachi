import { useNavigate } from 'react-router';
import { Button, Card, Col, Empty, Popconfirm, Row, Space, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, ExpandOutlined } from '@ant-design/icons';

import FotoCamara from './FotoCamara';

const { Text } = Typography;

const rutaDe = (nombre) => `/frames/vivo/pantalla/${encodeURIComponent(nombre)}`;

const chipDe = (camara, estado) => {
    if (!camara.habilitada) return <Tag>apagada</Tag>;
    if (!estado) return <Tag>sin datos</Tag>;
    return estado.en_linea
        ? <Tag color="green">{estado.camera_fps} fps</Tag>
        : <Tag color="red">sin señal</Tag>;
};

const Apagada = ({ alto }) => (
    <div style={{
        aspectRatio: '16 / 9',
        maxHeight: alto,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }}>
        <Text style={{ color: '#666', fontSize: 12 }}>apagada</Text>
    </div>
);

const MosaicoCamaras = ({
    camaras,
    estados,
    alto,
    version,
    columnas,
    oscuro,
    onEditar,
    onEliminar,
    puedeGestionar,
}) => {
    const navigate = useNavigate();

    if (camaras.length === 0) {
        return <Empty description="No hay cámaras en el catálogo" />;
    }

    const span = columnas || { xs: 24, sm: 12, xl: 8 };
    const gestion = puedeGestionar && !oscuro;

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
                                {chipDe(camara, estados[camara.nombre])}
                                {gestion && onEditar ? (
                                    <Tooltip title="Editar">
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<EditOutlined />}
                                            aria-label={`Editar ${camara.etiqueta}`}
                                            onClick={() => onEditar(camara)}
                                        />
                                    </Tooltip>
                                ) : null}
                                {gestion && onEliminar ? (
                                    <Popconfirm
                                        title="Eliminar cámara"
                                        description="Deja de administrarse desde mariachi."
                                        okText="Eliminar"
                                        cancelText="Cancelar"
                                        onConfirm={() => onEliminar(camara)}
                                    >
                                        <Button
                                            type="text"
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            aria-label={`Eliminar ${camara.etiqueta}`}
                                        />
                                    </Popconfirm>
                                ) : null}
                                {camara.habilitada ? (
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
                                ) : null}
                            </Space>
                        }
                    >
                        {camara.habilitada ? (
                            <FotoCamara
                                nombre={camara.nombre}
                                etiqueta={camara.etiqueta}
                                alto={alto}
                                version={version}
                                enLinea={estados[camara.nombre]?.en_linea}
                            />
                        ) : (
                            <Apagada alto={alto} />
                        )}
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
