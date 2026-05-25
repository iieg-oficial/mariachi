import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Row, Space, Tag, Typography, message } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router';

const { Text } = Typography;


const MAPALAB_REST_BASE = '/mapalab/api';
const MAPALAB_MCP_URL = '/mapalab/mcp';
const WIDGET_SCRIPT_URL = '/mapalab/widget/v1/mapalab.js';
const API_KEY_STORAGE_KEY = 'mariachi.mcp_playground.api_key';

const useMapalabWidgetScript = () => {
    useEffect(() => {
        if (document.querySelector('script[data-mapalab-widget]')) return;
        const s = document.createElement('script');
        s.src = WIDGET_SCRIPT_URL;
        s.defer = true;
        s.dataset.mapalabWidget = 'true';
        document.head.appendChild(s);
    }, []);
};


const PROBES = [
    {
        tool: 'search_layers',
        method: 'GET',
        path: '/layers/search',
        description: 'Busca capas por label, tags o id. Devuelve label + path jerárquico.',
        inputs: [
            { key: 'q', label: 'Texto', placeholder: 'p. ej. seguridad', required: true, type: 'string', default: 'homicidio' },
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
        description: 'Metadata completa de una capa identificada por workspace + layer. Acepta el id del visor (p. ej. tasa_homicidio_doloso) o el geoserver_layer.',
        inputs: [
            { key: 'workspace', label: 'Workspace (alias)', placeholder: 'p. ej. seguridad', required: true, type: 'string', default: 'seguridad' },
            { key: 'layer', label: 'Layer', placeholder: 'p. ej. tasa_homicidio_doloso', required: true, type: 'string', default: 'tasa_homicidio_doloso' },
        ],
    },
    {
        tool: 'get_periodicity',
        method: 'GET',
        path: '/periodicity/',
        description: 'Fechas year/month/day disponibles para una capa temporal.',
        inputs: [
            { key: 'workspace', label: 'Workspace', required: true, type: 'string', default: 'demografia' },
            { key: 'layer', label: 'Layer', required: true, type: 'string', default: 'poblacion' },
        ],
    },
    {
        tool: 'resolve_layer_ref',
        method: 'GET',
        path: '/layers/resolve',
        description: 'Resuelve un slug, alias público o id de capa. Devuelve la capa correspondiente.',
        inputs: [
            { key: 'ref', label: 'Slug / alias / id', required: true, type: 'string', default: 'tasa_homicidio_doloso' },
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
    const url = `${MAPALAB_REST_BASE}${path}${queryString}`;
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
        const url = MAPALAB_MCP_URL;
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
                JSON-RPC <Text code>initialize</Text> contra el endpoint raíz <Text code>{MAPALAB_MCP_URL}</Text> (<strong>sin</strong> slash). Desde mapalab 1.45.0 el MCP vive al nivel de <Text code>/mapalab/</Text>, no debajo de <Text code>/mapalab/api/</Text>. Útil para verificar que el container <Text code>mapalab-mcp</Text> está vivo y responde el handshake MCP.
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


const MCP_TOOL_PROBES = [
    {
        tool: 'measure_geometry',
        description: 'Calcula longitud (LineString) o área (Polygon) geodésica en metros/m² reales sobre WGS84. Default: línea Guadalajara → Zapopan (~8.26 km).',
        defaultArguments: {
            geometry: {
                type: 'LineString',
                coordinates: [[-103.349, 20.677], [-103.413, 20.721]],
            },
        },
    },
    {
        tool: 'create_single_share',
        description: 'Crea un share del visor con capas y anotaciones opcionales. Devuelve {id, url, embed_html} listo para pegar.',
        defaultArguments: {
            layers: ['tasa_homicidio_doloso'],
            view: { zoom: 9, lat: 20.6, lon: -103.4 },
            basemap: 'osm',
            annotations: [{
                id: 'zona1',
                type: 'Polygon',
                geometry: { type: 'Polygon', coordinates: [[[-103.4, 20.6], [-103.3, 20.6], [-103.3, 20.7], [-103.4, 20.7], [-103.4, 20.6]]] },
                label: 'Zona analizada',
            }],
        },
    },
    {
        tool: 'create_swipe_share',
        description: 'Crea un share en modo swipe (comparación A|B). Ideal para preguntas comparativas del usuario.',
        defaultArguments: {
            pane_a_layers: ['tasa_homicidio_doloso'],
            pane_b_layers: ['poblacion'],
            position: 0.5,
            view: { zoom: 8, lat: 20.6, lon: -103.4 },
            label_a: 'Homicidio',
            label_b: 'Población',
        },
    },
];


const parseSseResponse = (text) => {
    const dataLine = text.split('\n').find((line) => line.startsWith('data: '));
    const raw = dataLine ? dataLine.slice(6) : text;
    try { return JSON.parse(raw); } catch { return raw; }
};


const extractToolPayload = (jsonRpcResponse) => {
    const content = jsonRpcResponse?.result?.content?.[0]?.text;
    if (typeof content !== 'string') return jsonRpcResponse;
    try { return JSON.parse(content); } catch { return content; }
};


const SHARE_TOOLS = new Set(['create_single_share', 'create_swipe_share']);


const McpToolProbe = ({ probe, apiKey }) => {
    const [args, setArgs] = useState(JSON.stringify(probe.defaultArguments, null, 2));
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleRun = async () => {
        let parsedArgs;
        try {
            parsedArgs = JSON.parse(args);
        } catch (err) {
            setError(`JSON inválido en arguments: ${err.message}`);
            setResult(null);
            return;
        }
        setLoading(true);
        setError(null);
        const url = MAPALAB_MCP_URL;
        const body = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: { name: probe.tool, arguments: parsedArgs },
        };
        const start = performance.now();
        try {
            const response = await fetch(url, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
                body: JSON.stringify(body),
                credentials: 'omit',
            });
            const elapsedMs = Math.round(performance.now() - start);
            const text = await response.text();
            const jsonRpc = parseSseResponse(text);
            const toolPayload = extractToolPayload(jsonRpc);
            setResult({ status: response.status, ok: response.ok, body: toolPayload, elapsedMs, url });
            if (!response.ok) message.warning(`HTTP ${response.status}`);
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
                    <Tag color="magenta">tools/call</Tag>
                    <Text code>{probe.tool}</Text>
                </Space>
            }
            extra={
                <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={handleRun} loading={loading}>
                    Probar
                </Button>
            }
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>{probe.description}</Text>
            <Input.TextArea
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                autoSize={{ minRows: 5, maxRows: 14 }}
                style={{ fontFamily: 'monospace', fontSize: 11 }}
                spellCheck={false}
            />
            {error && <Alert type="error" message={error} showIcon style={{ marginTop: 8 }} />}
            {result && (
                <div style={{ marginTop: 12 }}>
                    <Space size={8} style={{ marginBottom: 6 }} wrap>
                        <Tag color={result.ok ? 'green' : 'red'}>HTTP {result.status}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{result.elapsedMs} ms</Text>
                    </Space>
                    <pre
                        style={{
                            background: '#1f1f1f',
                            color: '#f5f5f5',
                            padding: '12px 14px',
                            borderRadius: 6,
                            fontSize: 11,
                            lineHeight: 1.5,
                            maxHeight: 320,
                            overflow: 'auto',
                            margin: 0,
                        }}
                    >
                        <code>{typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}</code>
                    </pre>
                    {SHARE_TOOLS.has(probe.tool) && result.body?.id && (
                        apiKey ? (
                            <div style={{ marginTop: 12 }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                                    Previsualización del share <Text code>{result.body.id}</Text> con tu API key:
                                </Text>
                                <iieg-mapalab
                                    api-key={apiKey}
                                    share={result.body.id}
                                    height="450"
                                    controls="zoom"
                                />
                            </div>
                        ) : (
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                                Pega una <Text code>mk_pub_…</Text> arriba para ver este share embebido.
                            </Text>
                        )
                    )}
                </div>
            )}
        </Card>
    );
};


export default function McpPlayground() {
    useMapalabWidgetScript();
    const [apiKey, setApiKey] = useState(() => {
        try { return localStorage.getItem(API_KEY_STORAGE_KEY) || ''; } catch { return ''; }
    });

    const handleApiKeyChange = (value) => {
        const trimmed = (value || '').trim();
        setApiKey(trimmed);
        try {
            if (trimmed) localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
            else localStorage.removeItem(API_KEY_STORAGE_KEY);
        } catch { /* localStorage no disponible */ }
    };

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card size="small" title="API key del widget (opcional)">
                <Input.Password
                    placeholder="mk_pub_xxxxx..."
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    autoComplete="off"
                    allowClear
                />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                    Necesaria solo para previsualizar los shares de <Text code>create_single_share</Text> y <Text code>create_swipe_share</Text> embebidos debajo del JSON de respuesta. Genera o rota una key en <Link to="/mapalab/api-keys">Llaves del visor MapaLab</Link> con el dominio del admin en sitios autorizados. La key se guarda en <Text code>localStorage</Text> de este navegador.
                </Text>
            </Card>

            <McpRootProbe />

            <div style={{ marginTop: 8 }}>
                <Text strong style={{ fontSize: 13 }}>Tools del MCP (JSON-RPC <Text code>tools/call</Text>)</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    Los 3 tools de mapalab 1.44.0 — no tienen REST equivalente. Edita el JSON de <Text code>arguments</Text> antes de "Probar".
                </Text>
            </div>

            {MCP_TOOL_PROBES.map((probe) => (
                <McpToolProbe key={probe.tool} probe={probe} apiKey={apiKey} />
            ))}

            <div style={{ marginTop: 8 }}>
                <Text strong style={{ fontSize: 13 }}>Tools de lectura (REST equivalente)</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    Mismo dato que un agente vería a través del MCP, pero invocado por su endpoint REST para facilitar la prueba.
                </Text>
            </div>

            {PROBES.map((probe) => (
                <ProbeCard key={probe.tool} probe={probe} />
            ))}
        </Space>
    );
}
