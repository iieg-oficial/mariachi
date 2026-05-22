import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Row, Space, Tag, Typography, message } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;


const MAPALAB_BASE = '/mapalab/api';


const PROBES = [
    {
        tool: 'search_layers',
        method: 'GET',
        path: '/layers/search',
        description: 'Busca capas por label, tags o id. Devuelve label + path jerárquico.',
        inputs: [
            { key: 'q', label: 'Texto', placeholder: 'p. ej. seguridad', required: true, type: 'string', default: 'poblacion' },
            { key: 'limit', label: 'Límite', type: 'number', min: 1, max: 50, default: 5 },
        ],
    },
    {
        tool: 'get_workspaces',
        method: 'GET',
        path: '/layers/workspaces',
        description: 'Lista workspaces de GeoServer con sus alias.',
        inputs: [],
    },
    {
        tool: 'get_initial_order',
        method: 'GET',
        path: '/layers/initial-order',
        description: 'IDs de las capas activas al cargar el visor.',
        inputs: [],
    },
    {
        tool: 'get_metadata',
        method: 'GET',
        path: '/metadata/',
        description: 'Metadata completa de una capa identificada por workspace + layer.',
        inputs: [
            { key: 'workspace', label: 'Workspace (alias)', placeholder: 'p. ej. seguridad', required: true, type: 'string', default: 'economia' },
            { key: 'layer', label: 'Layer', placeholder: 'p. ej. tasa_homicidio_doloso', required: true, type: 'string', default: 'tasa_trabajadores_asegurados_hombres' },
        ],
    },
    {
        tool: 'get_periodicity',
        method: 'GET',
        path: '/periodicity/',
        description: 'Fechas year/month/day disponibles para una capa temporal.',
        inputs: [
            { key: 'workspace', label: 'Workspace', required: true, type: 'string', default: 'raster' },
            { key: 'layer', label: 'Layer', required: true, type: 'string', default: 'temperaturas' },
        ],
    },
    {
        tool: 'resolve_layer_ref',
        method: 'GET',
        path: '/layers/resolve',
        description: 'Resuelve un slug o alias público a una capa concreta.',
        inputs: [
            { key: 'ref', label: 'Slug / alias', required: true, type: 'string', default: 'tasa_homicidio_doloso' },
        ],
    },
];


const buildQueryString = (inputs, values) => {
    const params = new URLSearchParams();
    for (const input of inputs) {
        const value = values[input.key];
        if (value === undefined || value === '' || value === null) continue;
        params.set(input.key, String(value));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
};


const callRest = async ({ method, path, queryString }) => {
    const url = `${MAPALAB_BASE}${path}${queryString}`;
    const start = performance.now();
    const response = await fetch(url, {
        method,
        headers: { Accept: 'application/json' },
        credentials: 'omit',
    });
    const elapsedMs = Math.round(performance.now() - start);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await response.json() : await response.text();
    return { status: response.status, ok: response.ok, body, elapsedMs, url };
};


const ProbeCard = ({ probe }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleRun = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            setError(null);
            const queryString = buildQueryString(probe.inputs, values);
            const res = await callRest({ method: probe.method, path: probe.path, queryString });
            setResult(res);
            if (!res.ok) {
                message.warning(`HTTP ${res.status} — revisa el cuerpo de la respuesta`);
            }
        } catch (err) {
            if (err?.errorFields) return;
            setResult(null);
            setError(err?.message || 'Error al llamar el endpoint');
        } finally {
            setLoading(false);
        }
    };

    const defaults = probe.inputs.reduce((acc, input) => {
        acc[input.key] = input.default;
        return acc;
    }, {});

    return (
        <Card
            size="small"
            title={
                <Space size={8}>
                    <Tag color="purple">{probe.method}</Tag>
                    <Text code>{probe.tool}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{probe.path}</Text>
                </Space>
            }
            extra={
                <Button
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={handleRun}
                    loading={loading}
                >
                    Probar
                </Button>
            }
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                {probe.description}
            </Text>

            {probe.inputs.length > 0 && (
                <Form form={form} layout="vertical" initialValues={defaults} size="small">
                    <Row gutter={[12, 0]}>
                        {probe.inputs.map((input) => (
                            <Col xs={24} md={input.inputs?.length > 1 ? 12 : 24} key={input.key}>
                                <Form.Item
                                    name={input.key}
                                    label={input.label}
                                    rules={input.required ? [{ required: true, message: 'Requerido' }] : []}
                                    style={{ marginBottom: 8 }}
                                >
                                    {input.type === 'number' ? (
                                        <InputNumber min={input.min} max={input.max} style={{ width: '100%' }} />
                                    ) : (
                                        <Input placeholder={input.placeholder} allowClear />
                                    )}
                                </Form.Item>
                            </Col>
                        ))}
                    </Row>
                </Form>
            )}

            {error && <Alert type="error" message={error} showIcon style={{ marginTop: 8 }} />}

            {result && (
                <div style={{ marginTop: 12 }}>
                    <Space size={8} style={{ marginBottom: 6 }}>
                        <Tag color={result.ok ? 'green' : 'red'}>HTTP {result.status}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{result.elapsedMs} ms</Text>
                        <Text type="secondary" style={{ fontSize: 11 }} copyable={{ text: result.url }}>
                            {result.url}
                        </Text>
                    </Space>
                    <pre
                        style={{
                            background: '#1f1f1f',
                            color: '#f5f5f5',
                            padding: '12px 14px',
                            borderRadius: 6,
                            fontSize: 11,
                            lineHeight: 1.5,
                            maxHeight: 260,
                            overflow: 'auto',
                            margin: 0,
                        }}
                    >
                        <code>
                            {typeof result.body === 'string'
                                ? result.body
                                : JSON.stringify(result.body, null, 2)}
                        </code>
                    </pre>
                </div>
            )}
        </Card>
    );
};


const McpRootProbe = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleRun = async () => {
        setLoading(true);
        setError(null);
        const url = `${MAPALAB_BASE}/mcp`;
        const body = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'mariachi-admin-playground', version: '1.0' },
            },
        };
        const start = performance.now();
        try {
            const response = await fetch(url, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json, text/event-stream',
                },
                body: JSON.stringify(body),
                credentials: 'omit',
            });
            const elapsedMs = Math.round(performance.now() - start);
            const text = await response.text();
            let parsed;
            try { parsed = JSON.parse(text); } catch { parsed = text; }
            setResult({
                status: response.status,
                ok: response.ok,
                body: parsed,
                elapsedMs,
                url,
                finalUrl: response.url,
                redirected: response.redirected,
            });
            if (!response.ok) message.warning(`HTTP ${response.status} — revisa el cuerpo`);
        } catch (err) {
            setResult(null);
            setError(err?.message || 'Error al llamar el endpoint');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card
            size="small"
            title={
                <Space size={8}>
                    <Tag color="magenta">POST</Tag>
                    <Text code>mcp.initialize</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>/mcp (sin slash final)</Text>
                </Space>
            }
            extra={
                <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={handleRun} loading={loading}>
                    Probar
                </Button>
            }
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                JSON-RPC <Text code>initialize</Text> contra el endpoint raíz <Text code>{MAPALAB_BASE}/mcp</Text> (<strong>sin</strong> slash). El server responde con <Text code>307 → /mcp/</Text>; <Text code>fetch</Text> sigue el redirect automáticamente y obtiene la respuesta SSE/JSON. Útil para verificar que el container <Text code>mapalab-mcp</Text> está vivo y responde el handshake MCP.
            </Text>

            {error && <Alert type="error" message={error} showIcon style={{ marginTop: 8 }} />}

            {result && (
                <div style={{ marginTop: 12 }}>
                    <Space size={8} style={{ marginBottom: 6 }} wrap>
                        <Tag color={result.ok ? 'green' : 'red'}>HTTP {result.status}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{result.elapsedMs} ms</Text>
                        {result.redirected && <Tag color="gold">redirect → {result.finalUrl}</Tag>}
                        <Text type="secondary" style={{ fontSize: 11 }} copyable={{ text: result.url }}>
                            {result.url}
                        </Text>
                    </Space>
                    <pre
                        style={{
                            background: '#1f1f1f',
                            color: '#f5f5f5',
                            padding: '12px 14px',
                            borderRadius: 6,
                            fontSize: 11,
                            lineHeight: 1.5,
                            maxHeight: 260,
                            overflow: 'auto',
                            margin: 0,
                        }}
                    >
                        <code>
                            {typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}
                        </code>
                    </pre>
                </div>
            )}
        </Card>
    );
};


export default function McpPlayground() {
    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
                type="info"
                showIcon
                message="Playground"
                description={
                    <>
                        Los tools del MCP son re-exposiciones de los endpoints REST de MapaLab.
                        La primera tarjeta llama al protocolo MCP directamente (JSON-RPC) usando la URL <strong>sin slash</strong> que pegarías en un cliente; el resto llaman al REST equivalente vía <Text code>{MAPALAB_BASE}/*</Text>, la misma data que un agente vería a través del MCP. Solo se exponen tools de lectura sin efectos secundarios.
                    </>
                }
            />

            <McpRootProbe />

            {PROBES.map((probe) => (
                <ProbeCard key={probe.tool} probe={probe} />
            ))}
        </Space>
    );
}
