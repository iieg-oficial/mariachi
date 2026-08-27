import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert, Button, Card, Input, Layout, Segmented, Space, Spin, Table, Tag, Typography } from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    EyeInvisibleOutlined,
    PlusOutlined,
    SendOutlined,
} from '@ant-design/icons';
import DeleteEventoModal from '@features/mapalab-eventos/components/DeleteEventoModal';
import {
    despublicarEvento,
    eliminarEvento,
    publicarEvento,
    useEventosList,
} from '@features/mapalab-eventos/hooks/useEventos';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Title, Text } = Typography;

function formatDate(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return value;
    }
}

const ESTADO_OPTIONS = [
    { label: 'Todos', value: 'all' },
    { label: 'Publicados', value: 'published' },
    { label: 'Borradores', value: 'draft' },
];

function contarCapas(items) {
    let n = 0;
    for (const c of items || []) {
        if (c.tipo === 'capa') n += 1;
        else if (c.tipo === 'categoria') n += contarCapas(c.capas);
    }
    return n;
}


export default function EventosListPage() {
    const { items, loading, error, reload } = useEventosList();
    const navigate = useNavigate();
    const { isMobile } = useIsMobile();
    const [actingId, setActingId] = useState(null);
    const [search, setSearch] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('all');
    const [deletingEvento, setDeletingEvento] = useState(null);

    const filtered = useMemo(() => {
        let result = items || [];
        if (estadoFilter !== 'all') {
            result = result.filter((e) => e.estado === estadoFilter);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter((e) =>
                (e.titulo || '').toLowerCase().includes(q)
                || (e.slug || '').toLowerCase().includes(q));
        }
        return result;
    }, [items, search, estadoFilter]);

    const handlePublicar = async (record) => {
        setActingId(record.id);
        try {
            await publicarEvento(record.id);
            message.success(`Evento "${record.titulo}" publicado`);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al publicar');
        } finally {
            setActingId(null);
        }
    };

    const handleDespublicar = async (record) => {
        setActingId(record.id);
        try {
            await despublicarEvento(record.id);
            message.success(`Evento "${record.titulo}" pasado a borrador`);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al despublicar');
        } finally {
            setActingId(null);
        }
    };

    const handleEliminar = async ({ deleteOrphanLayers }) => {
        if (!deletingEvento) return;
        const record = deletingEvento;
        setActingId(record.id);
        try {
            const result = await eliminarEvento(record.id, { deleteOrphanLayers });
            const archived = result?.orphanLayersDeleted ?? 0;
            message.success(
                archived > 0
                    ? `Evento "${record.titulo}" eliminado (+${archived} capa${archived === 1 ? '' : 's'} archivada${archived === 1 ? '' : 's'})`
                    : `Evento "${record.titulo}" eliminado`,
            );
            setDeletingEvento(null);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            setActingId(null);
        }
    };

    const columns = [
        {
            title: 'Título',
            dataIndex: 'titulo',
            key: 'titulo',
            render: (titulo, record) => (
                <Space orientation="vertical" size={0}>
                    <Link to={`/mapalab/eventos/${record.id}/edit`}>
                        <Text strong>{titulo}</Text>
                    </Link>
                    <Text type="secondary" style={{ fontSize: 11 }}>{record.slug}</Text>
                </Space>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 110,
            render: (estado, record) => (
                <Space orientation="vertical" size={2}>
                    <Tag color={estado === 'published' ? 'green' : 'default'}>
                        {estado === 'published' ? 'Publicado' : 'Borrador'}
                    </Tag>
                    {!record.activo && <Tag color="orange">Inactivo</Tag>}
                </Space>
            ),
        },
        {
            title: 'Vigencia',
            key: 'vigencia',
            responsive: ['md'],
            render: (_, record) => (
                <Space orientation="vertical" size={0}>
                    <Text style={{ fontSize: 12 }}>Inicio: {formatDate(record.fechaInicio || record.fecha_inicio)}</Text>
                    <Text style={{ fontSize: 12 }}>Fin: {formatDate(record.fechaFin || record.fecha_fin)}</Text>
                </Space>
            ),
        },
        {
            title: 'Capas',
            key: 'capas',
            width: 70,
            align: 'center',
            render: (_, record) => <Tag>{contarCapas(record.capas)}</Tag>,
        },
        {
            title: 'Orden',
            dataIndex: 'orden',
            key: 'orden',
            width: 70,
            align: 'center',
            responsive: ['sm'],
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: isMobile ? 110 : 230,
            render: (_, record) => (
                <Space size={4} wrap>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/mapalab/eventos/${record.id}/edit`)}
                    >
                        {!isMobile && 'Editar'}
                    </Button>
                    {record.estado === 'published' ? (
                        <Button
                            size="small"
                            icon={<EyeInvisibleOutlined />}
                            loading={actingId === record.id}
                            onClick={() => handleDespublicar(record)}
                        >
                            {!isMobile && 'Despublicar'}
                        </Button>
                    ) : (
                        <Button
                            size="small"
                            type="primary"
                            icon={<SendOutlined />}
                            loading={actingId === record.id}
                            onClick={() => handlePublicar(record)}
                        >
                            {!isMobile && 'Publicar'}
                        </Button>
                    )}
                    <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={actingId === record.id}
                        onClick={() => setDeletingEvento(record)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <Content style={{ padding: isMobile ? 6 : 24, width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Eventos MapaLab</Title>
                    <Text type="secondary">
                        Eventos especiales que aparecen como icono entre Temas y Herramientas en el visor.
                        Soportan zoom a un área y un panel de subcapas personalizadas.
                    </Text>
                </div>

                {error && <Alert type="error" title={error} showIcon closable />}

                <Card
                    title={`${filtered.length} de ${items.length} evento${items.length === 1 ? '' : 's'}`}
                    extra={
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate('/mapalab/eventos/nuevo')}
                        >
                            Nuevo evento
                        </Button>
                    }
                >
                    <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }} wrap>
                        <Input.Search
                            placeholder="Buscar por título o slug"
                            aria-label="Buscar evento"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            allowClear
                            style={{ maxWidth: 320 }}
                        />
                        <Segmented
                            options={ESTADO_OPTIONS}
                            value={estadoFilter}
                            onChange={setEstadoFilter}
                        />
                    </Space>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={filtered}
                            pagination={{ pageSize: 20, showSizeChanger: false }}
                            size={isMobile ? 'small' : 'middle'}
                            scroll={{ x: 'max-content' }}
                        />
                    )}
                </Card>
            </Space>
            <DeleteEventoModal
                open={!!deletingEvento}
                evento={deletingEvento}
                onCancel={() => setDeletingEvento(null)}
                onConfirm={handleEliminar}
                loading={actingId === deletingEvento?.id}
            />
        </Content>
    );
}
