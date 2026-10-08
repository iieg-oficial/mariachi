import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Popconfirm, Space, Spin, Table, Tag, Typography } from 'antd';
import { ReloadOutlined, UndoOutlined, DeleteOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';

const { Text } = Typography;

const formatDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return iso; }
};

export default function DeletedLayersList({
    isAdmin,
    listDeleted,
    onRestore,
    onPurge,
    onAfterAction,
}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actingId, setActingId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listDeleted();
            setItems(data || []);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo cargar la papelera');
        } finally {
            setLoading(false);
        }
    }, [listDeleted]);

    useEffect(() => { load(); }, [load]);

    const handleRestore = async (record) => {
        setActingId(record.id);
        try {
            await onRestore(record.id);
            message.success(`'${record.label}' restaurada`);
            await load();
            onAfterAction?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo restaurar');
        } finally {
            setActingId(null);
        }
    };

    const handlePurge = async (record) => {
        setActingId(record.id);
        try {
            await onPurge(record.id);
            message.success(`'${record.label}' eliminada definitivamente`);
            await load();
            onAfterAction?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo purgar');
        } finally {
            setActingId(null);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
    }

    if (items.length === 0) {
        return (
            <div style={{ padding: 24 }}>
                <Empty
                    description="La papelera está vacía"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </div>
        );
    }

    const columns = [
        {
            title: 'Capa',
            key: 'label',
            render: (_, r) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{r.label}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>id: <code>{r.id}</code></Text>
                </Space>
            ),
        },
        {
            title: 'Tipo',
            dataIndex: 'nodeType',
            key: 'nodeType',
            width: 100,
            render: (t) => <Tag>{t}</Tag>,
        },
        {
            title: 'Archivada',
            key: 'deleted',
            width: 220,
            render: (_, r) => (
                <Space orientation="vertical" size={0}>
                    <Text style={{ fontSize: 12 }}>{formatDate(r.deletedAt)}</Text>
                    {r.deletedBy && <Text type="secondary" style={{ fontSize: 11 }}>por {r.deletedBy}</Text>}
                </Space>
            ),
        },
        {
            title: '',
            key: 'acciones',
            width: 200,
            render: (_, r) => (
                <Space size={4} wrap>
                    <Button
                        size="small"
                        icon={<UndoOutlined />}
                        loading={actingId === r.id}
                        onClick={() => handleRestore(r)}
                        disabled={!isAdmin}
                    >
                        Restaurar
                    </Button>
                    <Popconfirm
                        title="¿Eliminar definitivamente?"
                        description="Esta acción es irreversible."
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handlePurge(r)}
                        disabled={!isAdmin}
                    >
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={actingId === r.id}
                            disabled={!isAdmin}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 12, flexShrink: 0 }} wrap>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Capas archivadas: aparecen aquí en lugar de borrarse definitivamente. Pueden restaurarse en cualquier momento o eliminarse de forma permanente.
                </Text>
                <Button size="small" icon={<ReloadOutlined />} onClick={load}>Recargar</Button>
            </Space>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={items}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    size="small"
                />
            </div>
        </div>
    );
}
