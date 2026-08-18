import { CreditCardOutlined, IdcardOutlined } from '@ant-design/icons';
import { Card, Col, Row, Statistic, Tag, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { AYUDAS } from '@features/vine/constants/ayudas';
import { medioInfo } from '@features/vine/constants/medios';

const { Text } = Typography;

const COBERTURA_CONFIABLE = 95;

const Medio = ({ fila }) => {
    const info = medioInfo(fila.medio);
    const huella = info.confiable;
    const confiable = (fila.cobertura ?? 0) >= COBERTURA_CONFIABLE;

    return (
        <Card size="small">
            <Row align="middle" gutter={12}>
                <Col flex="none">
                    <span style={{ fontSize: 22, color: 'rgba(0, 0, 0, 0.45)' }}>
                        {huella ? <IdcardOutlined /> : <CreditCardOutlined />}
                    </span>
                </Col>
                <Col flex="auto">
                    <Text strong style={{ textTransform: 'capitalize' }}>{info.etiqueta}</Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {`${fila.personas} personas · ${fila.dias.toLocaleString('es-MX')} días`}
                    </Text>
                </Col>
                <Col flex="none">
                    <Tag color={confiable ? 'success' : 'warning'}>
                        {confiable ? 'Registro confiable' : 'Registro incompleto'}
                    </Tag>
                </Col>
            </Row>
            <Row gutter={12} style={{ marginTop: 12 }}>
                <Col span={12}>
                    <Statistic
                        title="Jornadas que cierran"
                        value={fila.cobertura ?? 0}
                        suffix="%"
                        precision={1}
                        valueStyle={{ fontSize: 20, color: confiable ? '#389E0D' : '#D46B08' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {`${fila.sin_salida.toLocaleString('es-MX')} días sin salida`}
                    </Text>
                </Col>
                <Col span={12}>
                    <Statistic
                        title="Jornada típica"
                        value={fila.jornada_mediana ?? 0}
                        suffix="h"
                        precision={2}
                        valueStyle={{ fontSize: 20 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {confiable ? 'medible' : 'subestimada'}
                    </Text>
                </Col>
            </Row>
        </Card>
    );
};

const ComparativaMedios = ({ medios = [], loading }) => {
    if (!loading && medios.length < 2) return null;

    const confiables = medios.filter((m) => medioInfo(m.medio).confiable);
    const flojos = medios.filter((m) => !medioInfo(m.medio).confiable);
    const mejor = confiables.sort((a, b) => (b.cobertura ?? 0) - (a.cobertura ?? 0))[0];
    const peor = flojos.sort((a, b) => (a.cobertura ?? 0) - (b.cobertura ?? 0))[0];
    const brecha = mejor && peor ? Math.round((mejor.cobertura ?? 0) - (peor.cobertura ?? 0)) : 0;

    return (
        <Card
            size="small"
            loading={loading}
            style={{ marginBottom: 16 }}
            title={<TituloConAyuda titulo="Huella y tarjeta no se registran igual" ayuda={AYUDAS.medios} ancho={440} />}
        >
            <Row gutter={[16, 16]}>
                {medios.map((m) => (
                    <Col xs={24} md={12} xl={8} key={m.medio}>
                        <Medio fila={m} />
                    </Col>
                ))}
            </Row>
            {brecha > 0 && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                    {`Quien marca con huella o perfil de superusuario cierra su jornada ${brecha} puntos más seguido. La jornada de quien usa tarjeta sale más corta porque le faltan salidas, no porque trabaje menos: por eso las horas se miden sólo sobre el registro de huella.`}
                </Text>
            )}
        </Card>
    );
};

export default ComparativaMedios;
