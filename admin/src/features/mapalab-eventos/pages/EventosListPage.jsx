import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    Alert,
    Button,
    Card,
    Layout,
    Modal,
    Popconfirm,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    EyeInvisibleOutlined,
    PlusOutlined,
    SendOutlined,
} from '@ant-design/icons';
import {
    despublicarEvento,
    eliminarEvento,
    publicarEvento,
    useEventosList,
} from '@features/mapalab-eventos/hooks/useEventos';
import useIsMobile from '@shared/hooks/useIsMobile';

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


export default function EventosListPage() {
    const { items, loading, error, reload } = useEventosList();
    const navigate = useNavigate();
    const { isMobile } = useIsMobile();
    const [actingId, setActingId] = useState(null);

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

    const handleEliminar = async (record) => {
        setActingId(record.id);
        try {
            await eliminarEvento(record.id);
            message.success(`Evento "${record.titulo}" eliminado`);
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
                <Space direction="vertical" size={0}>
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
                <Space direction="vertical" size={2}>
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
                <Space direction="vertical" size={0}>
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
            render: (_, record) => <Tag>{(record.capas || []).length}</Tag>,
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
                    <Popconfirm
                        title="¿Eliminar evento?"
                        description="Esta acción no se puede deshacer."
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleEliminar(record)}
                    >
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={actingId === record.id}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Eventos MapaLab</Title>
                    <Text type="secondary">
                        Eventos especiales que aparecen como icono entre Temas y Herramientas en el visor.
                        Soportan zoom a un área y un panel de subcapas personalizadas.
                    </Text>
                </div>

                {error && <Alert type="error" message={error} showIcon closable />}

                <Card
                    title={`${items.length} evento${items.length === 1 ? '' : 's'}`}
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
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={items}
                            pagination={{ pageSize: 20, showSizeChanger: false }}
                            size={isMobile ? 'small' : 'middle'}
                            scroll={{ x: 'max-content' }}
                        />
                    )}
                </Card>
            </Space>
        </Content>
    );
}
