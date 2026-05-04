import { useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Input,
    Layout,
    Popconfirm,
    Select,
    Space,
    Spin,
    Table,
    Tabs,
    Tag,
    Typography,
} from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import {
    eliminarReporte,
    useReportesContadores,
    useReportesList,
} from '@features/reportes/hooks/useReportes';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import {
    ESTADO_COLORS,
    ESTADO_LABELS,
    SOURCE_APPS,
    TIPO_COLORS,
    TIPO_LABELS,
    formatDate,
} from '@features/reportes/constants';
import ReporteDrawer from '@features/reportes/components/ReporteDrawer';

const { Content } = Layout;
const { Title, Text } = Typography;


export default function ReportesListPage() {
    const { isMobile } = useIsMobile();
    const [sourceApp, setSourceApp] = useState('mapalab');
    const [tipo, setTipo] = useState();
    const [estado, setEstado] = useState();
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState(null);
    const [actingId, setActingId] = useState(null);

    const { data, loading, error, reload, setParams } = useReportesList({
        source_app: sourceApp,
        page: 1,
        size: 20,
    });
    const { contadores, reload: reloadCounts } = useReportesContadores();

    const tabBadge = useMemo(() => {
        const result = {};
        for (const slug of Object.keys(contadores || {})) {
            result[slug] = contadores[slug]?.nuevo || 0;
        }
        return result;
    }, [contadores]);

    const applyFilters = (next = {}) => {
        const merged = {
            source_app: sourceApp,
            tipo,
            estado,
            q: q || undefined,
            page: 1,
            size: 20,
            ...next,
        };
        setParams(merged);
        setPage(merged.page);
    };

    const handleEliminar = async (record) => {
        setActingId(record.id);
        try {
            await eliminarReporte(record.id);
            message.success(`Reporte #${record.id} eliminado`);
            await reload();
            await reloadCounts();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            setActingId(null);
        }
    };

    const columns = [
        {
            title: 'Tipo',
            dataIndex: 'tipo',
            width: 130,
            render: (t) => <Tag color={TIPO_COLORS[t]}>{TIPO_LABELS[t]}</Tag>,
        },
        {
            title: 'Mensaje',
            dataIndex: 'mensaje',
            render: (text, record) => (
                <Space direction="vertical" size={0} style={{ maxWidth: 420 }}>
                    <Text
                        ellipsis={{ tooltip: text }}
                        style={{ display: 'block', maxWidth: 400 }}
                    >
                        {text}
                    </Text>
                    {record.sourceRoute && (
                        <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                            {record.sourceRoute}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            width: 120,
            render: (e) => <Tag color={ESTADO_COLORS[e]}>{ESTADO_LABELS[e]}</Tag>,
        },
        {
            title: 'Recibido',
            dataIndex: 'creadoEn',
            width: 150,
            responsive: ['md'],
            render: formatDate,
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: isMobile ? 90 : 180,
            render: (_, record) => (
                <Space size={4} wrap>
                    <Button size="small" onClick={() => setOpenId(record.id)}>
                        {isMobile ? 'Ver' : 'Ver detalle'}
                    </Button>
                    <Popconfirm
                        title="¿Eliminar reporte?"
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

    const tabItems = SOURCE_APPS.map((app) => ({
        key: app.value,
        label: (
            <span>
                {app.label}
                {tabBadge[app.value] > 0 && (
                    <span
                        style={{
                            marginLeft: 6,
                            background: '#ff4d4f',
                            color: '#fff',
                            borderRadius: 10,
                            padding: '0 6px',
                            fontSize: 11,
                        }}
                    >
                        {tabBadge[app.value]}
                    </span>
                )}
            </span>
        ),
    }));

    return (
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Reportes</Title>
                    <Text type="secondary">
                        Reportes y sugerencias enviados desde los sitios públicos.
                    </Text>
                </div>

                {error && <Alert type="error" message={error} showIcon closable />}

                <Tabs
                    activeKey={sourceApp}
                    onChange={(key) => {
                        setSourceApp(key);
                        applyFilters({ source_app: key });
                    }}
                    items={tabItems}
                />

                <Card>
                    <Space wrap style={{ marginBottom: 16 }}>
                        <Select
                            allowClear
                            placeholder="Tipo"
                            value={tipo}
                            style={{ width: 160 }}
                            onChange={(v) => { setTipo(v); applyFilters({ tipo: v }); }}
                            options={Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label }))}
                        />
                        <Select
                            allowClear
                            placeholder="Estado"
                            value={estado}
                            style={{ width: 160 }}
                            onChange={(v) => { setEstado(v); applyFilters({ estado: v }); }}
                            options={Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }))}
                        />
                        <Input.Search
                            placeholder="Buscar en mensaje, ruta, email"
                            allowClear
                            style={{ width: 280 }}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onSearch={(value) => applyFilters({ q: value || undefined })}
                        />
                        <Button icon={<ReloadOutlined />} onClick={() => { reload(); reloadCounts(); }}>
                            Refrescar
                        </Button>
                    </Space>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={data.items}
                            pagination={{
                                current: page,
                                pageSize: data.size,
                                total: data.total,
                                showSizeChanger: false,
                                onChange: (next) => {
                                    setPage(next);
                                    applyFilters({ page: next });
                                },
                            }}
                            size={isMobile ? 'small' : 'middle'}
                            scroll={{ x: 'max-content' }}
                            onRow={(record) => ({ onClick: () => setOpenId(record.id) })}
                        />
                    )}
                </Card>
            </Space>

            <ReporteDrawer
                id={openId}
                onClose={() => setOpenId(null)}
                onChanged={() => { reload(); reloadCounts(); }}
            />
        </Content>
    );
}
