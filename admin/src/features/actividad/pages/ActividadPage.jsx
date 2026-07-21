import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Avatar, Button, Card, Col, DatePicker, Empty, Input, Pagination, Row, Select, Skeleton,
    Space, Table, Tabs, Tag, Tooltip, Typography,
} from 'antd';
import { ReloadOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import {
    ACTION_LABELS, ACTION_PREFIXES, META_KEY_LABELS, RESOURCE_LABELS, ROLE_TAG,
    formatActividadDate, formatMetaValue,
} from '@features/actividad/constants';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PAGE_SIZE = 50;

const TAB_ITEMS = [
    { key: '', label: 'Todo' },
    ...ACTION_PREFIXES.map((p) => ({ key: p.value, label: p.label.replace(/\s*\(.*\)$/, '') })),
];

export default function ActividadPage() {
    const { isMobile } = useIsMobile();
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        action_prefix: '',
        actor_role: '',
        actor_id: '',
        resource_type: '',
        rango: null,
    });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, page_size: PAGE_SIZE };
            if (filters.action_prefix) params.action_prefix = filters.action_prefix;
            if (filters.actor_role) params.actor_role = filters.actor_role;
            if (filters.actor_id) params.actor_id = filters.actor_id;
            if (filters.resource_type) params.resource_type = filters.resource_type;
            if (filters.rango?.[0]) params.desde = filters.rango[0].toISOString();
            if (filters.rango?.[1]) params.hasta = filters.rango[1].toISOString();
            const { data } = await api.get('/actividad', { params });
            setItems(data.items || []);
            setTotal(data.total || 0);
        } catch {
            message.error('Error al cargar actividad');
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [filters]);

    const updateFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value || '' }));

    const columns = useMemo(() => [
        {
            title: 'Fecha',
            dataIndex: 'created_at',
            key: 'created_at',
            render: formatActividadDate,
            width: 180,
        },
        {
            title: 'Usuario',
            key: 'actor',
            render: (_, row) => {
                const role = ROLE_TAG[row.actor_role];
                if (!row.actor_id) {
                    return <Text type="secondary">Sistema</Text>;
                }
                const displayName = row.actor_name || row.actor_username || `#${row.actor_id}`;
                return (
                    <Space size={8}>
                        <Avatar size="small" src={row.actor_avatar_url} icon={<UserOutlined />} />
                        <Space direction="vertical" size={0}>
                            <Space size={6}>
                                <Text strong style={{ fontSize: 13 }}>{displayName}</Text>
                                {role && <Tag color={role.color} style={{ marginInlineEnd: 0 }}>{role.label}</Tag>}
                            </Space>
                            {row.actor_username && row.actor_name && (
                                <Text type="secondary" style={{ fontSize: 11 }}>@{row.actor_username}</Text>
                            )}
                        </Space>
                    </Space>
                );
            },
            width: 240,
        },
        {
            title: 'Accion',
            dataIndex: 'action',
            key: 'action',
            render: (a) => {
                const meta = ACTION_LABELS[a];
                if (!meta) return <Text code style={{ fontSize: 12 }}>{a}</Text>;
                return (
                    <Tooltip title={a}>
                        <Tag color={meta.color}>{meta.text}</Tag>
                    </Tooltip>
                );
            },
            width: 220,
        },
        {
            title: 'Recurso',
            key: 'recurso',
            render: (_, row) => {
                if (!row.resource_type) return <Text type="secondary">—</Text>;
                const label = RESOURCE_LABELS[row.resource_type] || row.resource_type;
                return (
                    <Text style={{ fontSize: 12 }}>
                        {label}
                        {row.resource_id != null && (
                            <Text type="secondary"> #{row.resource_id}</Text>
                        )}
                    </Text>
                );
            },
            width: 180,
        },
        {
            title: 'Detalle',
            dataIndex: 'metadata',
            key: 'metadata',
            render: (m, row) => {
                const entries = m ? Object.entries(m) : [];
                if (entries.length === 0 && !row.ip) return <Text type="secondary">—</Text>;
                return (
                    <Space direction="vertical" size={2}>
                        {entries.map(([k, v]) => (
                            <Text key={k} style={{ fontSize: 12 }}>
                                <Text type="secondary">{META_KEY_LABELS[k] || k}:</Text>{' '}
                                {formatMetaValue(v)}
                            </Text>
                        ))}
                        {row.ip && (
                            <Text type="secondary" style={{ fontSize: 11 }}>IP: {row.ip}</Text>
                        )}
                    </Space>
                );
            },
        },
    ], []);

    return (
        <div>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: 12,
                marginBottom: 16,
            }}>
                <div>
                    <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Actividad</Title>
                    <Text type="secondary">Audit log de acciones admin sobre usuarios y formularios SIEEJ.</Text>
                </div>
                <Button icon={<ReloadOutlined />} onClick={load} block={isMobile}>Refrescar</Button>
            </div>

            <Tabs
                activeKey={filters.action_prefix}
                onChange={updateFilter('action_prefix')}
                items={TAB_ITEMS}
                style={{ marginBottom: 8 }}
            />

            <Card style={{ marginBottom: 16 }}>
                <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12} md={8}>
                        <Select
                            allowClear
                            placeholder="Rol del actor"
                            value={filters.actor_role || undefined}
                            onChange={updateFilter('actor_role')}
                            style={{ width: '100%' }}
                            options={Object.entries(ROLE_TAG).map(([v, { label }]) => ({ value: v, label }))}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            allowClear
                            placeholder="ID del actor"
                            type="number"
                            prefix={<SearchOutlined />}
                            value={filters.actor_id}
                            onChange={(e) => updateFilter('actor_id')(e.target.value)}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <RangePicker
                            showTime
                            style={{ width: '100%' }}
                            value={filters.rango}
                            onChange={(r) => setFilters((f) => ({ ...f, rango: r }))}
                        />
                    </Col>
                </Row>
            </Card>

            {loading ? (
                <Card><Skeleton active /></Card>
            ) : items.length === 0 ? (
                <Card><Empty description="Sin actividad con los filtros aplicados" /></Card>
            ) : (
                <Card styles={{ body: { padding: 0 } }}>
                    <Table
                        columns={columns}
                        dataSource={items}
                        rowKey="id"
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                        size={isMobile ? 'small' : 'middle'}
                    />
                    <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                        <Pagination
                            current={page}
                            pageSize={PAGE_SIZE}
                            total={total}
                            onChange={setPage}
                            showSizeChanger={false}
                            showTotal={(t, range) => `${range[0]}–${range[1]} de ${t} eventos`}
                            simple={isMobile}
                        />
                    </div>
                </Card>
            )}
        </div>
    );
}
