import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Layout, Space, Spin, Tag, Typography } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import SectionHeader from '@shared/components/SectionHeader';
import { SEMANTIC } from '@app/providers/brand';
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

    const sinNodo = datos.nodos.find((n) => n.node === 'sin-nodo');

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

                {sinNodo && (
                    <Alert
                        type="info"
                        showIcon
                        message={`${sinNodo.servicios.length} servicios sin nodo declarado`}
                        description="Les falta ONTOY_NODE en el .env de su sidecar; hasta entonces se agrupan aparte."
                    />
                )}

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
                            {[
                                ['Enlace sano', SEMANTIC.success],
                                ['Sin respuesta', SEMANTIC.danger],
                            ].map(([texto, color]) => (
                                <Space key={texto} size={6}>
                                    <span style={{ width: 18, height: 3, borderRadius: 2, background: color, display: 'block' }} />
                                    <Text type="secondary" style={{ fontSize: 11 }}>{texto}</Text>
                                </Space>
                            ))}
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Click en un nodo para ver su detalle
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
