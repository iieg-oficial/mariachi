import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Layout, Space, Spin, Tag, Typography } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import SectionHeader from '@shared/components/SectionHeader';
import { ESCALA_LATENCIA } from '@shared/components/nodos/latencia';
import { getNodos } from '@shared/services/nodosService';
import MapaNodos from '@shared/components/nodos/MapaNodos';
import NodoDetalleModal from '@shared/components/nodos/NodoDetalleModal';
import BitacoraEventos from '@features/nodos/components/BitacoraEventos';

const { Content } = Layout;
const { Text } = Typography;

const REFRESCO_MS = 60000;

export default function NodosPage() {
    const [datos, setDatos] = useState({ nodos: [], aristas: [], eventos: [], environment: null });
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [seleccionado, setSeleccionado] = useState(null);

    const cargar = useCallback(() => getNodos()
        .then((data) => { setDatos(data); setError(null); })
        .catch(() => setError('El monitor no respondió'))
        .finally(() => setCargando(false)), []);

    useEffect(() => {
        cargar();
        const intervalo = setInterval(cargar, REFRESCO_MS);
        return () => clearInterval(intervalo);
    }, [cargar]);

    return (
        <Content style={{ width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <PageHeading
                    icon={<CloudServerOutlined />}
                    title="Servidores"
                    description="Nodos del ecosistema, sus recursos y sus enlaces"
                    marginBottom={0}
                />

                {error && <Alert type="error" showIcon message={error} />}

                <div>
                    <SectionHeader
                        icon={<CloudServerOutlined />}
                        title="Mapa"
                        subtitle={datos.environment ? `ambiente ${datos.environment}` : 'enlaces entre nodos'}
                        badge={<Tag color="blue">{`${datos.nodos.length} nodos`}</Tag>}
                    />
                    <Card size="small">
                        {cargando ? (
                            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                        ) : (
                            <MapaNodos
                                nodos={datos.nodos}
                                aristas={datos.aristas}
                                onSeleccionar={setSeleccionado}
                            />
                        )}
                        <Space size={16} wrap style={{ marginTop: 12 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Latencia del enlace:</Text>
                            {ESCALA_LATENCIA.map((tramo) => (
                                <Space key={tramo.texto} size={6}>
                                    <span style={{ width: 18, height: 3, borderRadius: 2, background: tramo.color, display: 'block' }} />
                                    <Text type="secondary" style={{ fontSize: 11 }}>{tramo.texto}</Text>
                                </Space>
                            ))}
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Punteado sin tráfico: sin respuesta
                            </Text>
                        </Space>
                    </Card>
                </div>

                <div>
                    <SectionHeader
                        icon={<CloudServerOutlined />}
                        title="Bitácora"
                        subtitle="caídas y recuperaciones"
                    />
                    <Card size="small">
                        {cargando ? (
                            <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                        ) : (
                            <BitacoraEventos eventos={datos.eventos} />
                        )}
                    </Card>
                </div>
            </Space>

            <NodoDetalleModal
                nodo={seleccionado}
                aristas={datos.aristas}
                open={Boolean(seleccionado)}
                onClose={() => setSeleccionado(null)}
            />
        </Content>
    );
}
