import { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer, Empty, Segmented, Space, Spin, Table, Tag, Tooltip, Typography } from 'antd';
import { fetchGridHistory } from '@shared/services/gridService';

const { Text } = Typography;

const SOURCE_TAGS = {
    grid: { color: 'purple', label: 'Tabla' },
    formulario: { color: 'blue', label: 'Ficha' },
    ingesta: { color: 'gold', label: 'Ingesta' },
    backfill: { color: 'default', label: 'Inicial' },
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function GridHistoryDrawer({
    open,
    onClose,
    resource,
    columnsMeta = [],
    rowKey = null,
    rowLabel = null,
}) {
    const [scope, setScope] = useState('row');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);

    const effectiveScope = rowKey ? scope : 'all';

    const titles = useMemo(
        () => Object.fromEntries(columnsMeta.map((meta) => [meta.key, meta.title])),
        [columnsMeta],
    );

    const load = useCallback(async () => {
        if (!open) return;
        setLoading(true);
        try {
            const data = await fetchGridHistory(resource, {
                rowKey: effectiveScope === 'row' ? rowKey : undefined,
                limit: 300,
            });
            setEntries(data || []);
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [open, resource, effectiveScope, rowKey]);

    useEffect(() => { load(); }, [load]);

    const columns = useMemo(() => {
        const base = [
            {
                title: 'Campo',
                dataIndex: 'column_key',
                width: 170,
                render: (value) => <Text style={{ fontSize: 12 }}>{titles[value] || value}</Text>,
            },
            {
                title: 'Cambio',
                dataIndex: 'to_value',
                render: (_value, record) => (
                    <Space size={4} wrap style={{ fontSize: 12 }}>
                        <Text delete type="secondary" style={{ fontSize: 12 }}>
                            {record.from_value || '(vacío)'}
                        </Text>
                        <Text type="secondary">→</Text>
                        <Text strong style={{ fontSize: 12 }}>{record.to_value || '(vacío)'}</Text>
                    </Space>
                ),
            },
            {
                title: 'Quién',
                dataIndex: 'changed_by',
                width: 170,
                render: (value, record) => (
                    <Tooltip title={formatDate(record.changed_at)}>
                        <Space orientation="vertical" size={0}>
                            <Text style={{ fontSize: 12 }}>{value || 'Sin registrar'}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {formatDate(record.changed_at)}
                            </Text>
                        </Space>
                    </Tooltip>
                ),
            },
            {
                title: 'Origen',
                dataIndex: 'source',
                width: 90,
                render: (value) => {
                    const tag = SOURCE_TAGS[value] || { color: 'default', label: value };
                    return <Tag color={tag.color} style={{ fontSize: 11 }}>{tag.label}</Tag>;
                },
            },
        ];
        if (effectiveScope === 'all') {
            base.unshift({
                title: 'Capa',
                dataIndex: 'row_key',
                width: 200,
                render: (value) => <Text style={{ fontSize: 12 }} code>{value}</Text>,
            });
        }
        return base;
    }, [titles, effectiveScope]);

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={effectiveScope === 'all' ? 900 : 760}
            title={(
                <Space orientation="vertical" size={2}>
                    <Text strong>Historial de cambios</Text>
                    {rowKey && effectiveScope === 'row' && (
                        <Text type="secondary" style={{ fontSize: 12 }}>{rowLabel || rowKey}</Text>
                    )}
                </Space>
            )}
            extra={rowKey ? (
                <Segmented
                    size="small"
                    value={scope}
                    onChange={setScope}
                    options={[
                        { label: 'Esta capa', value: 'row' },
                        { label: 'Todas', value: 'all' },
                    ]}
                />
            ) : null}
        >
            {loading ? (
                <Spin style={{ display: 'block', margin: '48px auto' }} />
            ) : entries.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        effectiveScope === 'row'
                            ? 'Esta capa no tiene cambios registrados todavía'
                            : 'Todavía no hay cambios registrados'
                    }
                />
            ) : (
                <Table
                    size="small"
                    rowKey={(record) => `${record.row_key}-${record.column_key}-${record.changed_at}`}
                    columns={columns}
                    dataSource={entries}
                    pagination={{ pageSize: 25, size: 'small', showSizeChanger: false }}
                    scroll={{ x: true }}
                />
            )}
        </Drawer>
    );
}

