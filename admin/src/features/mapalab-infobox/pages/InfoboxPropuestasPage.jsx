import { useCallback, useEffect, useState } from 'react';
import {
    Button,
    Card,
    Empty,
    Input,
    Layout,
    Modal,
    Segmented,
    Space,
    Spin,
    Tag,
    Typography,
} from 'antd';
import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import ConfigDiff from '@features/mapalab-infobox/components/ConfigDiff';
import {
    aprobarPropuesta,
    listPropuestas,
    rechazarPropuesta,
} from '@features/mapalab-infobox/api/infoboxPropuestasService';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const ESTADO_TAG = {
    pendiente: { color: 'gold', label: 'Pendiente' },
    aprobada: { color: 'green', label: 'Aprobada' },
    rechazada: { color: 'red', label: 'Rechazada' },
};

export default function InfoboxPropuestasPage() {
    const { isMobile } = useIsMobile();
    const [estado, setEstado] = useState('pendiente');
    const [propuestas, setPropuestas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(null);
    const [rechazando, setRechazando] = useState(null);
    const [motivo, setMotivo] = useState('');

    const cargar = useCallback(async (siguienteEstado) => {
        setCargando(true);
        try {
            setPropuestas(await listPropuestas(siguienteEstado));
        } catch {
            message.error('No se pudieron cargar las propuestas');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar(estado);
    }, [estado, cargar]);

    const handleAprobar = async (propuesta) => {
        setProcesando(propuesta.id);
        try {
            await aprobarPropuesta(propuesta.id);
            message.success(`Tarjeta de ${propuesta.capaSlug} actualizada`);
            cargar(estado);
        } catch (e) {
            message.error(e?.response?.data?.detail || 'No se pudo aprobar');
        } finally {
            setProcesando(null);
        }
    };

    const handleRechazar = async () => {
        if (motivo.trim().length < 3) {
            message.warning('Escribe el motivo del rechazo');
            return;
        }
        setProcesando(rechazando.id);
        try {
            await rechazarPropuesta(rechazando.id, motivo.trim());
            message.success('Propuesta rechazada');
            setRechazando(null);
            setMotivo('');
            cargar(estado);
        } catch (e) {
            message.error(e?.response?.data?.detail || 'No se pudo rechazar');
        } finally {
            setProcesando(null);
        }
    };

    return (
        <Content style={{ padding: isMobile ? 8 : 24, width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Space align="center" size={12}>
                        <EditOutlined style={{ fontSize: 24, color: '#5C2472' }} />
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Propuestas de tarjeta</Title>
                    </Space>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        Cambios que la gente propone desde el Catálogo para la tarjeta de información de una capa.
                        Al aprobar se aplica sobre la capa del catálogo; el visor principal no cambia.
                    </Paragraph>
                </div>

                <Segmented
                    value={estado}
                    onChange={setEstado}
                    options={[
                        { label: 'Pendientes', value: 'pendiente' },
                        { label: 'Aprobadas', value: 'aprobada' },
                        { label: 'Rechazadas', value: 'rechazada' },
                        { label: 'Todas', value: 'todas' },
                    ]}
                />

                {cargando ? (
                    <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
                ) : propuestas.length === 0 ? (
                    <Empty description="No hay propuestas en este estado" />
                ) : (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        {propuestas.map((p) => (
                            <Card
                                key={p.id}
                                size="small"
                                title={
                                    <Space wrap>
                                        <Text strong>{p.capaSlug}</Text>
                                        <Tag color={ESTADO_TAG[p.estado]?.color}>{ESTADO_TAG[p.estado]?.label}</Tag>
                                        <Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>
                                            {new Date(p.creadoEn).toLocaleString('es-MX')}
                                        </Text>
                                    </Space>
                                }
                                extra={p.estado === 'pendiente' && (
                                    <Space>
                                        <Button
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            loading={procesando === p.id}
                                            onClick={() => handleAprobar(p)}
                                        >
                                            Aprobar
                                        </Button>
                                        <Button
                                            danger
                                            icon={<CloseOutlined />}
                                            onClick={() => { setRechazando(p); setMotivo(''); }}
                                        >
                                            Rechazar
                                        </Button>
                                    </Space>
                                )}
                            >
                                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                    <ConfigDiff vigente={p.configVigente} propuesta={p.config} />

                                    {p.comentario && (
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Comentario de quien propone</Text>
                                            <Paragraph style={{ marginBottom: 0 }}>{p.comentario}</Paragraph>
                                        </div>
                                    )}

                                    {p.revisadoPor && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>Revisó: {p.revisadoPor}</Text>
                                    )}

                                    {p.comentarioRevision && (
                                        <Text type="danger" style={{ fontSize: 12 }}>
                                            Motivo del rechazo: {p.comentarioRevision}
                                        </Text>
                                    )}
                                </Space>
                            </Card>
                        ))}
                    </Space>
                )}
            </Space>

            <Modal
                open={!!rechazando}
                title={`Rechazar propuesta de ${rechazando?.capaSlug || ''}`}
                onCancel={() => setRechazando(null)}
                onOk={handleRechazar}
                okText="Rechazar"
                okButtonProps={{ danger: true, loading: procesando === rechazando?.id }}
                cancelText="Cancelar"
            >
                <Paragraph type="secondary">
                    El motivo queda guardado con la propuesta, como registro de por qué no se aplicó.
                </Paragraph>
                <Input.TextArea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Por ejemplo: el campo propuesto es un identificador interno que no aporta a quien consulta."
                />
            </Modal>
        </Content>
    );
}
