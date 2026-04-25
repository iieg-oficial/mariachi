import { useState, useEffect, useCallback } from 'react';
import { Table, Card, Typography, Button, Space, Modal, Input, message, Tag } from 'antd';
import { useNavigate } from 'react-router';
import { EditOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Title } = Typography;

export default function RevisionQueue() {
    const { isMobile } = useIsMobile();
    const navigate = useNavigate();
    const [borradores, setBorradores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rechazarModalVisible, setRechazarModalVisible] = useState(false);
    const [borradorSeleccionado, setBorradorSeleccionado] = useState(null);
    const [comentario, setComentario] = useState('');

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

    const columns = [
        {
            title: 'Recurso',
            key: 'recurso',
            render: (_, record) => isMenu(record)
                ? <Tag color="purple">Menú de navegación</Tag>
                : record.data?.title || `Página ${record.resource_id}`
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
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => isMenu(record) ? handleMenuPreview(record) : handlePreview(record)}
                    >
                        {isMobile ? '' : 'Vista previa'}
                    </Button>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => isMenu(record)
                            ? navigate(`/menu?review=true&borrador=${record.id}`)
                            : navigate(`/pages/edit/${record.resource_id}?review=true&borrador=${record.id}`)
                        }
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
                    <strong>{isMenu(borradorSeleccionado) ? 'Menú de navegación' : borradorSeleccionado?.data?.title}</strong> fue rechazado.
                </p>
                <Input.TextArea
                    placeholder="Motivo del rechazo (opcional)"
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    rows={3}
                />
            </Modal>
        </div>
    );
}
