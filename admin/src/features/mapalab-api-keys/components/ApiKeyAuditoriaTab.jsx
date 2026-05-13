import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    DatePicker,
    Form,
    Input,
    Pagination,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { listAccesos } from '@features/mapalab-api-keys/api/mapalabApiKeysService';
import { useLayerTree } from '@features/mapalab-api-keys/hooks/useLayerTree';

const { Text } = Typography;
const { RangePicker } = DatePicker;


const RESULTADO_TAGS = {
    allowed: { color: 'green', label: 'Permitido' },
    denied: { color: 'red', label: 'Bloqueado' },
    quota_exceeded: { color: 'orange', label: 'Sin cuota' },
};

const ENDPOINT_LABEL = {
    config: 'Carga inicial',
    tree: 'Árbol de capas',
    wms: 'Mapa (WMS)',
};


export default function ApiKeyAuditoriaTab({ apiKey }) {
    const { labelByRef } = useLayerTree();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(20);
    const [rango, setRango] = useState(null);
    const [filtroOrigen, setFiltroOrigen] = useState('');
    const [filtroCapa, setFiltroCapa] = useState('');
    const [filtroResultado, setFiltroResultado] = useState(null);
    const [filtroEndpoint, setFiltroEndpoint] = useState(null);

    const apiKeyId = apiKey?.id;
    const fetchRows = useCallback(async () => {
        if (!apiKeyId) return;
        setLoading(true);
        setError(null);
        try {
            const params = { page, size };
            if (rango && rango[0]) params.desde = rango[0].toISOString();
            if (rango && rango[1]) params.hasta = rango[1].toISOString();
            if (filtroOrigen) params.origin = filtroOrigen;
            if (filtroCapa) params.capa = filtroCapa;
            if (filtroResultado) params.resultado = filtroResultado;
            if (filtroEndpoint) params.endpoint = filtroEndpoint;
            const data = await listAccesos(apiKeyId, params);
            setRows(Array.isArray(data?.items) ? data.items : []);
            setTotal(data?.total ?? 0);
        } catch (err) {
            setError(err?.response?.data?.detail || 'No se pudieron cargar los registros de acceso');
        } finally {
            setLoading(false);
        }
    }, [apiKeyId, page, size, rango, filtroOrigen, filtroCapa, filtroResultado, filtroEndpoint]);

    useEffect(() => { fetchRows(); }, [fetchRows]);

    const columns = useMemo(() => [
        {
            title: 'Fecha y hora',
            dataIndex: 'timestamp',
            width: 165,
            render: (ts) => <Text style={{ fontSize: 11 }}>{new Date(ts).toLocaleString('es-MX')}</Text>,
        },
        {
            title: 'Resultado',
            dataIndex: 'resultado',
            width: 110,
            render: (r) => {
                const tag = RESULTADO_TAGS[r] || { color: 'default', label: r };
                return <Tag color={tag.color}>{tag.label}</Tag>;
            },
        },
        {
            title: 'Acción',
            dataIndex: 'endpoint',
            width: 130,
            render: (e) => <Text style={{ fontSize: 12 }}>{ENDPOINT_LABEL[e] || e}</Text>,
        },
        {
            title: 'Sitio que pidió el mapa',
            dataIndex: 'origin',
            ellipsis: true,
            render: (o) => o ? <Text style={{ fontSize: 11 }} code>{o}</Text> : <Text type="secondary">—</Text>,
        },
        {
            title: 'Capas',
            dataIndex: 'layers',
            ellipsis: true,
            render: (list) => {
                if (!list?.length) return <Text type="secondary">—</Text>;
                const labels = list.map((l) => labelByRef[l] || l);
                return (
                    <Tooltip title={labels.join(', ')}>
                        <Space size={4} wrap>
                            <Tag color="blue" style={{ fontSize: 10 }}>{labels[0]}</Tag>
                            {labels.length > 1 && <Tag>+{labels.length - 1}</Tag>}
                        </Space>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Motivo',
            dataIndex: 'motivo',
            width: 160,
            ellipsis: true,
            render: (m) => m ? <Text style={{ fontSize: 11 }}>{m}</Text> : <Text type="secondary">—</Text>,
        },
    ], [labelByRef]);

    const limpiarFiltros = () => {
        setRango(null);
        setFiltroOrigen('');
        setFiltroCapa('');
        setFiltroResultado(null);
        setFiltroEndpoint(null);
        setPage(1);
    };

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
                type="info"
                showIcon
                closable
                message="Historial de accesos al mapa con esta llave"
                description="Cada vez que un visitante carga el mapa, queda un registro aquí (sitio que lo pidió, capas mostradas, resultado y motivo si fue rechazado). Útil para auditoría y para responder solicitudes del área jurídica. Los registros se conservan 90 días."
            />

            <Card size="small" title="Filtros">
                <Form layout="vertical" size="small">
                    <Row gutter={[12, 8]}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label="Rango de fechas"
                                tooltip="Filtra los registros por fecha de cuando se hizo la petición."
                            >
                                <RangePicker
                                    showTime
                                    style={{ width: '100%' }}
                                    value={rango}
                                    onChange={(value) => { setRango(value); setPage(1); }}
                                    placeholder={['Desde', 'Hasta']}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item
                                label="Resultado"
                                tooltip="Filtra por si la petición fue permitida, bloqueada o si la llave se quedó sin cuota."
                            >
                                <Select
                                    allowClear
                                    value={filtroResultado}
                                    onChange={(value) => { setFiltroResultado(value); setPage(1); }}
                                    placeholder="Todos los resultados"
                                    options={[
                                        { value: 'allowed', label: 'Permitido' },
                                        { value: 'denied', label: 'Bloqueado' },
                                        { value: 'quota_exceeded', label: 'Sin cuota disponible' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item
                                label="Tipo de acción"
                                tooltip="Filtra por qué parte del mapa se pidió (carga inicial, árbol de capas o imagen del mapa)."
                            >
                                <Select
                                    allowClear
                                    value={filtroEndpoint}
                                    onChange={(value) => { setFiltroEndpoint(value); setPage(1); }}
                                    placeholder="Todos"
                                    options={[
                                        { value: 'config', label: 'Carga inicial del visor' },
                                        { value: 'tree', label: 'Listado de capas' },
                                        { value: 'wms', label: 'Imagen del mapa (WMS)' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label="Sitio (origen)"
                                tooltip="Filtra por la dirección del sitio que pidió mostrar el mapa. Acepta búsqueda parcial."
                            >
                                <Input
                                    value={filtroOrigen}
                                    onChange={(e) => { setFiltroOrigen(e.target.value); setPage(1); }}
                                    placeholder="Ejemplo: salud.jalisco.gob.mx"
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label="Capa específica"
                                tooltip="Filtra por una capa concreta. Captura el identificador en formato workspace:capa (ejemplo: economia:cultivos)."
                            >
                                <Input
                                    value={filtroCapa}
                                    onChange={(e) => { setFiltroCapa(e.target.value); setPage(1); }}
                                    placeholder="Ejemplo: economia:cultivos"
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Space wrap>
                        <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Actualizar</Button>
                        <Button onClick={limpiarFiltros}>Limpiar filtros</Button>
                    </Space>
                </Form>
            </Card>

            {error && <Alert type="error" showIcon closable message={error} />}

            <Card size="small">
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={rows}
                    pagination={false}
                    size="small"
                    loading={loading}
                    tableLayout="fixed"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <Pagination
                        current={page}
                        pageSize={size}
                        total={total}
                        showSizeChanger
                        pageSizeOptions={[10, 20, 50, 100]}
                        onChange={(p, s) => { setPage(p); setSize(s); }}
                        showTotal={(t, [a, b]) => `${a}–${b} de ${t}`}
                    />
                </div>
            </Card>
        </Space>
    );
}
