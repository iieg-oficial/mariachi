import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import ComparativaMedios from '@features/vine/components/ComparativaMedios';
import PanelPerfiles from '@features/vine/components/PanelPerfiles';
import PanelPersonas from '@features/vine/components/PanelPersonas';
import { AYUDAS } from '@features/vine/constants/ayudas';

const { Text } = Typography;

const EXCLUIDOS = ['Plantilla', 'Baja', 'Sin asignar'];

const TabPersonal = ({ resumen, personas, loading, verPersonas }) => {
    const panorama = resumen?.panorama;
    const vinculos = resumen?.vinculos ?? [];
    const plantilla = vinculos.find((v) => v.vinculo === 'Plantilla');
    const externos = vinculos
        .filter((v) => !EXCLUIDOS.includes(v.vinculo))
        .reduce((suma, v) => suma + v.personas, 0);

    return (
        <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic
                            title={<TituloConAyuda titulo="Personas con registro" ayuda={AYUDAS.personasActivas} />}
                            value={panorama?.personas_activas ?? 0}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {`de ${panorama?.personas_registradas ?? 0} dadas de alta`}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic title="Plantilla" value={plantilla?.personas ?? 0} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {`${plantilla?.con_huella ?? 0} marcan con huella`}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic title="Prácticas y servicio" value={externos} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            practicantes, servicio social y apoyo
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card loading={loading}>
                        <Statistic
                            title={<TituloConAyuda titulo="Jornada típica" ayuda={AYUDAS.jornadaTipica} />}
                            value={panorama?.jornada_mediana ?? 0}
                            suffix="h"
                            precision={2}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {`sobre ${panorama?.personas_huella ?? 0} personas con huella`}
                        </Text>
                    </Card>
                </Col>
            </Row>

            <PanelPerfiles
                vinculos={vinculos}
                horarios={resumen?.horarios ?? []}
                loading={loading}
            />

            <ComparativaMedios medios={resumen?.medios ?? []} loading={loading} />

            {verPersonas
                ? <PanelPersonas datos={personas} loading={loading} />
                : (
                    <Alert
                        type="info"
                        showIcon
                        title="Los datos por persona necesitan un permiso aparte"
                        description="Quién acumula más horas, quién madruga y las rachas son dato personal laboral: se piden con «Vine - estadisticas con nombres»."
                    />
                )}
        </>
    );
};

export default TabPersonal;
