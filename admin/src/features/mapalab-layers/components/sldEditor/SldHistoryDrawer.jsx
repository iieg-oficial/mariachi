import { useCallback, useEffect, useState } from 'react';
import { Button, Drawer, Empty, List, Popconfirm, Space, Spin, Tag, Typography } from 'antd';
import { RedoOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import { message } from '@shared/services/message';
import BorradorPreview from './BorradorPreview';

const { Text } = Typography;


function formatDate(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return value;
    }
}


export default function SldHistoryDrawer({ open, onClose, workspace, styleName, onRestored }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [restoringId, setRestoringId] = useState(null);

    const resourceId = workspace && styleName ? `${workspace}:${styleName}` : null;

    const reload = useCallback(async () => {
        if (!resourceId) return;
        setLoading(true);
        try {
            const res = await api.get(`/borradores/historial/sld/${encodeURIComponent(resourceId)}`);
            setItems(res.data || []);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al cargar historial');
        } finally {
            setLoading(false);
        }
    }, [resourceId]);

    useEffect(() => {
        if (open) reload();
    }, [open, reload]);

    const handleRestore = async (id) => {
        setRestoringId(id);
        try {
            await api.post(`/borradores/por-id/${id}/re-aplicar`);
            message.success('Versión restaurada y aplicada en GeoServer');
            onRestored?.();
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo restaurar');
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <Drawer
            title="Historial de SLDs aplicados"
            placement="right"
            size={480}
            open={open}
            onClose={onClose}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{items.length} versiones</Text>}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : items.length === 0 ? (
                <Empty description="Aún no hay versiones aprobadas para este estilo" />
            ) : (
                <List
                    dataSource={items}
                    renderItem={(item, idx) => {
                        const shape = item.data?.shape || 'choropleth';
                        const isLatest = idx === 0;
                        return (
                            <List.Item
                                style={{
                                    background: isLatest ? '#fff7e6' : 'transparent',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 6,
                                    marginBottom: 12,
                                    padding: 12,
                                    display: 'block',
                                }}
                            >
                                <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                                    <Space wrap>
                                        <Tag color={isLatest ? 'orange' : 'default'}>
                                            {isLatest ? 'Versión actual' : `#${items.length - idx}`}
                                        </Tag>
                                        <Tag>{shape}</Tag>
                                    </Space>
                                    <Text style={{ fontSize: 12 }}>
                                        Aplicado por <strong>{item.usuario?.name || '—'}</strong>
                                        {' '}el {formatDate(item.aprobado_en)}
                                    </Text>
                                    {item.data?.style_title && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Título: {item.data.style_title}
                                        </Text>
                                    )}
                                    <div style={{ background: '#fafafa', borderRadius: 4, padding: 8 }}>
                                        <BorradorPreview shape={shape} model={item.data} />
                                    </div>
                                    {!isLatest && (
                                        <Popconfirm
                                            title="Restaurar esta versión"
                                            description="Se aplicará en GeoServer inmediatamente, sobreescribiendo el SLD actual."
                                            okText="Restaurar"
                                            cancelText="Cancelar"
                                            onConfirm={() => handleRestore(item.id)}
                                        >
                                            <Button
                                                icon={<RedoOutlined />}
                                                loading={restoringId === item.id}
                                                block
                                            >
                                                Restaurar esta versión
                                            </Button>
                                        </Popconfirm>
                                    )}
                                </Space>
                            </List.Item>
                        );
                    }}
                />
            )}
        </Drawer>
    );
}
