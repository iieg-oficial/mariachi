import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Input,
    Layout,
    Segmented,
    Select,
    Space,
    Spin,
    Table,
    Tabs,
    Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
    eliminarReporte,
    useReportesContadores,
    useReportesList,
} from '@features/colibri/hooks/useReportes';
import { listReportesGrupos } from '@features/colibri/api/reportesService';
import { useReporteTipos } from '@features/colibri/hooks/useReporteTipos';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import {
    ESTADO_LABELS,
    SOURCE_APPS,
} from '@features/colibri/constants';
import ReporteDrawer from '@features/colibri/components/ReporteDrawer';
import {
    buildFlatColumns,
    buildGroupedColumns,
} from '@features/colibri/components/reportesTableColumns';

const { Content } = Layout;
const { Title, Text } = Typography;


export default function ReportesListPage() {
    const { isMobile } = useIsMobile();
    const [sourceApp, setSourceApp] = useState('');
    const [tipo, setTipo] = useState();
    const [estado, setEstado] = useState();
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState(null);
    const [actingId, setActingId] = useState(null);
    const [view, setView] = useState('flat');
    const [grupos, setGrupos] = useState({ items: [], total: 0, page: 1, size: 20 });
    const [gruposLoading, setGruposLoading] = useState(false);

    const { data, loading, error, reload, setParams } = useReportesList({
        source_app: sourceApp || undefined,
        page: 1,
        size: 20,
    });
    const { contadores, reload: reloadCounts } = useReportesContadores();
    const { tipos: tiposCatalogo, labels: TIPO_LABELS, colors: TIPO_COLORS } = useReporteTipos();

    useEffect(() => {
        if (view !== 'grouped') return;
        let cancelled = false;
        setGruposLoading(true);
        listReportesGrupos({ source_app: sourceApp || undefined, page: 1, size: 20 })
            .then((res) => { if (!cancelled) setGrupos(res); })
            .catch(() => { if (!cancelled) setGrupos({ items: [], total: 0, page: 1, size: 20 }); })
            .finally(() => { if (!cancelled) setGruposLoading(false); });
        return () => { cancelled = true; };
    }, [view, sourceApp]);

    const tabBadge = useMemo(() => {
        const result = {};
        for (const slug of Object.keys(contadores || {})) {
            result[slug] = contadores[slug]?.nuevo || 0;
        }
        return result;
    }, [contadores]);

    const applyFilters = (next = {}) => {
        const merged = {
            source_app: sourceApp || undefined,
            tipo,
            estado,
            q: q || undefined,
            page: 1,
            size: 20,
            ...next,
        };
        if (!merged.source_app) merged.source_app = undefined;
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

    const columns = buildFlatColumns({
        isMobile,
        actingId,
        onOpen: setOpenId,
        onEliminar: handleEliminar,
        tipoLabels: TIPO_LABELS,
        tipoColors: TIPO_COLORS,
    });

    const sourceAppLabels = SOURCE_APPS.reduce(
        (acc, app) => ({ ...acc, [app.value]: app.label }),
        {},
    );
    const sourceAppKeys = useMemo(() => {
        const keys = new Set(SOURCE_APPS.map((app) => app.value));
        Object.keys(contadores || {}).forEach((slug) => keys.add(slug));
        return [...keys];
    }, [contadores]);
    const totalNuevos = Object.values(tabBadge).reduce((sum, n) => sum + n, 0);

    const renderBadge = (n) => (n > 0 ? (
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
            {n}
        </span>
    ) : null);

    const tabItems = [
        { key: '', label: <span>Todos{renderBadge(totalNuevos)}</span> },
        ...sourceAppKeys.map((slug) => ({
            key: slug,
            label: <span>{sourceAppLabels[slug] || slug}{renderBadge(tabBadge[slug] || 0)}</span>,
        })),
    ];

    return (
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Reportes</Title>
                    <Text type="secondary">
                        Reportes y sugerencias enviados desde los sitios públicos.
                    </Text>
                </div>

                {error && <Alert type="error" title={error} showIcon closable />}

                <Tabs
                    activeKey={sourceApp}
                    onChange={(key) => {
                        setSourceApp(key);
                        applyFilters({ source_app: key });
                    }}
                    items={tabItems}
                />

                <Card>
                    <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                        <Space wrap>
                            <Select
                                allowClear
                                placeholder="Tipo"
                                value={tipo}
                                style={{ width: 160 }}
                                onChange={(v) => { setTipo(v); applyFilters({ tipo: v }); }}
                                options={
                                    tiposCatalogo.length > 0
                                        ? tiposCatalogo.map((t) => ({ value: t.slug, label: t.label }))
                                        : Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label }))
                                }
                                disabled={view === 'grouped'}
                            />
                            <Select
                                allowClear
                                placeholder="Estado"
                                value={estado}
                                style={{ width: 160 }}
                                onChange={(v) => { setEstado(v); applyFilters({ estado: v }); }}
                                options={Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }))}
                                disabled={view === 'grouped'}
                            />
                            <Input.Search
                                placeholder="Buscar en mensaje, ruta, email"
                                allowClear
                                style={{ width: 280 }}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onSearch={(value) => applyFilters({ q: value || undefined })}
                                disabled={view === 'grouped'}
                            />
                            <Button icon={<ReloadOutlined />} onClick={() => { reload(); reloadCounts(); }}>
                                Refrescar
                            </Button>
                        </Space>
                        <Segmented
                            value={view}
                            onChange={setView}
                            options={[
                                { value: 'flat', label: 'Lista' },
                                { value: 'grouped', label: 'Agrupados' },
                            ]}
                        />
                    </Space>

                    {view === 'grouped' ? (
                        gruposLoading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                        ) : (
                            <Table
                                rowKey="grupoId"
                                size={isMobile ? 'small' : 'middle'}
                                pagination={false}
                                dataSource={grupos.items}
                                scroll={{ x: 'max-content' }}
                                columns={buildGroupedColumns({
                                    onOpen: setOpenId,
                                    tipoLabels: TIPO_LABELS,
                                    tipoColors: TIPO_COLORS,
                                })}
                            />
                        )
                    ) : loading ? (
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
