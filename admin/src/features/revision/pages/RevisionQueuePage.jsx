import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Table, Card, Typography, Button, Space, Modal, Input, Tag } from 'antd';
import { useNavigate } from 'react-router';
import { EditOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Title } = Typography;

const BorradorCapaRevisionModal = lazy(() => import('@features/mapalab-layers')
    .then((m) => ({ default: m.BorradorCapaRevisionModal })));

const TIPOS_DE_CAPA = {
    layer: 'Capa',
    layer_metadata: 'Metadatos',
    layer_stats: 'Estadísticas',
};

export default function RevisionQueue() {
    const { isMobile } = useIsMobile();
    const navigate = useNavigate();
    const [borradores, setBorradores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rechazarModalVisible, setRechazarModalVisible] = useState(false);
    const [borradorSeleccionado, setBorradorSeleccionado] = useState(null);
    const [comentario, setComentario] = useState('');
    const [borradorCapa, setBorradorCapa] = useState(null);
    const [aprobando, setAprobando] = useState(false);

    const fetchPendientes = useCallback(async () => {
        try {
            const response = await api.get('/borradores/pendientes');
            setBorradores(response.data);
        } catch {
            message.error('Error al cargar la cola de revisión');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        api.get('/borradores/pendientes')
            .then((res) => { if (!cancelled) setBorradores(res.data); })
            .catch(() => message.error('Error al cargar la cola de revisión'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handlePreview = async (borrador) => {
        const WEB_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:3010';
        try {
            const { data } = await api.post(`/preview/paginas/${borrador.resource_id}`, {
                sections: borrador.data.sections || [],
                title: borrador.data.title || '',
                slug: borrador.data.slug || ''
            });
            const slug = borrador.data.slug || '';
            const previewPath = slug === 'home' ? '/' : `/${slug}`;
            window.open(`${WEB_URL}${previewPath}?preview=${data.token}`, '_blank');
        } catch {
            message.error('Error al generar vista previa');
        }
    };

    const handleMenuPreview = async (borrador) => {
        const WEB_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:3010';
        try {
            const { data } = await api.post('/preview/menu', {
                items: borrador.data.menuItems || []
            });
            window.open(`${WEB_URL}/?menu-preview=${data.token}`, '_blank');
        } catch {
            message.error('Error al generar vista previa del menú');
        }
    };

    const handleRechazar = (borrador) => {
        setBorradorSeleccionado(borrador);
        setComentario('');
        setRechazarModalVisible(true);
    };

    const handleAprobarCapa = async (borrador) => {
        setAprobando(true);
        try {
            await api.post(`/borradores/por-id/${borrador.id}/aprobar`);
            message.success('Borrador aprobado y publicado');
            setBorradorCapa(null);
            fetchPendientes();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al aprobar el borrador');
        } finally {
            setAprobando(false);
        }
    };

    const handleRechazarCapa = (borrador) => {
        setBorradorCapa(null);
        handleRechazar(borrador);
    };

    const confirmarRechazo = async () => {
        try {
            await api.post(`/borradores/por-id/${borradorSeleccionado.id}/rechazar`, { comentario });
            message.success('Borrador rechazado');
            setRechazarModalVisible(false);
            fetchPendientes();
        } catch {
            message.error('Error al rechazar el borrador');
        }
    };

    const isMenu = (record) => record?.resource_type === 'elementos-menu';
    const isEvento = (record) => record?.resource_type === 'evento';
    const isHomeSection = (record) => record?.resource_type === 'home_section';
    const isSld = (record) => record?.resource_type === 'sld';
    const isLayerDraft = (record) => Boolean(TIPOS_DE_CAPA[record?.resource_type]);
    const layerDraftName = (record) => `${TIPOS_DE_CAPA[record.resource_type]}: ${record.data?.label || record.resource_id}`;

    const tipoTag = (record) => {
        if (isMenu(record)) return <Tag color="purple">Menú de navegación</Tag>;
        if (isEvento(record)) return <Tag color="geekblue">Evento: {record.data?.titulo || record.resource_id}</Tag>;
        if (isHomeSection(record)) return <Tag color="cyan">Home: {record.resource_id}</Tag>;
        if (isSld(record)) {
            const shape = record.data?.shape || 'choropleth';
            const label = shape === 'point' ? 'Punto' : shape === 'boundary' ? 'Boundary' : 'Coroplético';
            return <Tag color="green">Simbología ({label}): {record.resource_id}</Tag>;
        }
        if (isLayerDraft(record)) return <Tag color="blue">{layerDraftName(record)}</Tag>;
        return record.data?.title || `Página ${record.resource_id}`;
    };

    const editPath = (record) => {
        if (isMenu(record)) return `/menu?review=true&borrador=${record.id}`;
        if (isEvento(record)) return `/mapalab/eventos/${record.resource_id}/edit?review=true&borrador=${record.id}`;
        if (isHomeSection(record)) return `/mapalab/home?review=true&borrador=${record.id}`;
        if (isSld(record)) {
            const layerId = record.data?.layer_id;
            const styleName = record.data?.style_name || record.resource_id?.split(':').slice(1).join(':') || '';
            if (layerId) {
                const params = new URLSearchParams({
                    tab: 'simbologia',
                    review: 'true',
                    borrador: String(record.id),
                });
                if (styleName) params.set('style', styleName);
                return `/mapalab/layers/${layerId}/edit?${params.toString()}`;
            }
            return `/mapalab/layers?review=true&borrador=${record.id}`;
        }
        return `/pages/edit/${record.resource_id}?review=true&borrador=${record.id}`;
    };

    const supportsPreview = (record) => isMenu(record)
        || (!isEvento(record) && !isHomeSection(record) && !isSld(record) && !isLayerDraft(record));

    const handleRevisar = (record) => {
        if (isLayerDraft(record)) setBorradorCapa(record);
        else navigate(editPath(record));
    };

    const nombreDelRecurso = (record) => {
        if (!record) return '';
        if (isMenu(record)) return 'Menú de navegación';
        if (isEvento(record)) return `evento "${record.data?.titulo || record.resource_id}"`;
        if (isHomeSection(record)) return `sección home "${record.resource_id}"`;
        if (isSld(record)) return `simbología "${record.resource_id}"`;
        if (isLayerDraft(record)) return `${TIPOS_DE_CAPA[record.resource_type].toLowerCase()} "${record.data?.label || record.resource_id}"`;
        return record.data?.title;
    };

    const columns = [
        {
            title: 'Recurso',
            key: 'recurso',
            render: (_, record) => tipoTag(record)
        },
        {
            title: 'Editor',
            key: 'editor',
            render: (_, record) => record.usuario?.name || '—'
        },
        {
            title: 'Enviado',
            dataIndex: 'actualizado_en',
            key: 'actualizado_en',
            render: (date) => new Date(date).toLocaleString('es-MX')
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            render: () => <Tag color="orange">Pendiente revisión</Tag>
        },
        {
            title: 'Acciones',
            key: 'acciones',
            fixed: isMobile ? undefined : 'right',
            width: isMobile ? undefined : 360,
            render: (_, record) => (
                <Space size="small" wrap>
                    {supportsPreview(record) && (
                        <Button
                            icon={<EyeOutlined />}
                            onClick={() => isMenu(record) ? handleMenuPreview(record) : handlePreview(record)}
                        >
                            {isMobile ? '' : 'Vista previa'}
                        </Button>
                    )}
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleRevisar(record)}
                    >
                        {isMobile ? '' : 'Revisar'}
                    </Button>
                    <Button
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => handleRechazar(record)}
                    >
                        {isMobile ? '' : 'Rechazar'}
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div>
            <Title level={isMobile ? 3 : 2} style={{ marginBottom: 16 }}>Cola de revisión</Title>

            <Card styles={{ body: { padding: isMobile ? 0 : undefined } }}>
                <Table
                    columns={columns}
                    dataSource={borradores}
                    rowKey="id"
                    loading={loading}
                    size={isMobile ? 'small' : 'middle'}
                    scroll={{ x: 'max-content' }}
                    pagination={{
                        pageSize: 20,
                        simple: isMobile,
                        showTotal: (total) => `${total} pendientes`
                    }}
                    locale={{ emptyText: 'Sin borradores pendientes de revisión' }}
                />
            </Card>

            <Modal
                title="Rechazar borrador"
                open={rechazarModalVisible}
                onOk={confirmarRechazo}
                onCancel={() => setRechazarModalVisible(false)}
                okText="Rechazar"
                okType="danger"
                cancelText="Cancelar"
                width={isMobile ? '100%' : 520}
                centered={isMobile}
            >
                <p>
                    Se notificará a <strong>{borradorSeleccionado?.usuario?.name}</strong> que su borrador de{' '}
                    <strong>{nombreDelRecurso(borradorSeleccionado)}</strong> fue rechazado.
                </p>
                <Input.TextArea
                    placeholder="Motivo del rechazo (opcional)"
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    rows={3}
                />
            </Modal>

            {borradorCapa && (
                <Suspense fallback={null}>
                    <BorradorCapaRevisionModal
                        borrador={borradorCapa}
                        onClose={() => setBorradorCapa(null)}
                        onAprobar={handleAprobarCapa}
                        onRechazar={handleRechazarCapa}
                        aprobando={aprobando}
                        width={isMobile ? '100%' : 640}
                    />
                </Suspense>
            )}
        </div>
    );
}
