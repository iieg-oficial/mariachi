import { useState } from 'react';
import { Button, Card, Input, Space, Tag, Typography } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;


const MAPALAB_MCP_URL = '/mapalab/mcp';

const INITIALIZE_PARAMS = {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mariachi-admin-playground', version: '1.0' },
};

const MCP_TOOL_PROBES = [
    {
        tool: 'search_layers',
        description: 'Busca capas por texto o tema y devuelve el id que usan las demás.',
        defaultArguments: { query: 'homicidio', limit: 5 },
    },
    {
        tool: 'describe_layer',
        description: 'Cualidades, metadata, numeralia y años disponibles de una capa.',
        defaultArguments: { layer: 'homicidio_doloso' },
    },
    {
        tool: 'municipios',
        description: 'Busca municipios por nombre o clave INEGI.',
        defaultArguments: { query: 'guadalajara', limit: 5 },
    },
    {
        tool: 'layer_table',
        description: 'Filas legibles de una capa, filtrables y paginadas.',
        defaultArguments: { layer: 'homicidio_doloso', municipio: 'Guadalajara', year: '2024', por_pagina: 5 },
    },
    {
        tool: 'layer_stats',
        description: 'Conteo, suma, promedio y reparto por clase sin descargar elementos.',
        defaultArguments: { layer: 'homicidio_doloso', municipio: 'Guadalajara', year: '2024' },
    },
    {
        tool: 'create_map',
        description: 'Crea un mapa compartible y devuelve su url.',
        defaultArguments: { layers: ['homicidio_doloso'], municipio: 'Guadalajara', year: '2024', basemap: 'voyager' },
    },
    {
        tool: 'create_swipe',
        beta: true,
        description: 'Comparador A|B de una capa en dos años o de dos capas.',
        defaultArguments: { layer: 'homicidio_doloso', year_a: '2024', year_b: '2023', municipio: 'Guadalajara' },
    },
];


const parseSseResponse = (text) => {
    const dataLine = text.split('\n').find((line) => line.startsWith('data: '));
    const raw = dataLine ? dataLine.slice(6) : text;
    try { return JSON.parse(raw); } catch { return raw; }
};


const extractToolPayload = (jsonRpc) => {
    const content = jsonRpc?.result?.content?.[0]?.text;
    if (typeof content !== 'string') return jsonRpc;
    try { return JSON.parse(content); } catch { return content; }
};


const callMcp = async (method, params) => {
    const start = performance.now();
    const response = await fetch(MAPALAB_MCP_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
        credentials: 'omit',
    });
    const elapsedMs = Math.round(performance.now() - start);
    const jsonRpc = parseSseResponse(await response.text());
    return {
        status: response.status,
        ok: response.ok,
        isError: Boolean(jsonRpc?.result?.isError),
        body: method === 'tools/call' ? extractToolPayload(jsonRpc) : jsonRpc,
        elapsedMs,
    };
};


const ResultBlock = ({ result }) => (
    <div style={{ marginTop: 12 }}>
        <Space size={8} style={{ marginBottom: 6 }} wrap>
            <Tag color={result.ok ? 'green' : 'red'}>HTTP {result.status}</Tag>
            {result.isError && <Tag color="red">isError</Tag>}
            <Text type="secondary" style={{ fontSize: 12 }}>{result.elapsedMs} ms</Text>
            {typeof result.body?.url === 'string' && (
                <a href={result.body.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                    Abrir en el visor
                </a>
            )}
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
    </div>
);


const useMcpCall = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const run = async (method, params) => {
        setLoading(true);
        setError(null);
        try {
            setResult(await callMcp(method, params));
        } catch (err) {
            setResult(null);
            setError(err?.message || 'Error al llamar el endpoint');
        } finally {
            setLoading(false);
        }
    };

    return { loading, result, error, setError, setResult, run };
};


const RunButton = ({ onClick, loading }) => (
    <Button type="primary" size="small" shape="round" icon={<PlayCircleOutlined />} onClick={onClick} loading={loading}>
        Probar
    </Button>
);


const McpRootProbe = () => {
    const { loading, result, error, run } = useMcpCall();

    return (
        <Card
            size="small"
            title={
                <Space size={8}>
                    <Tag color="magenta">POST</Tag>
                    <Text code>initialize</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{MAPALAB_MCP_URL}</Text>
                </Space>
            }
            extra={<RunButton onClick={() => run('initialize', INITIALIZE_PARAMS)} loading={loading} />}
        >
            <Text type="secondary" style={{ fontSize: 12 }}>Handshake MCP para comprobar que el servidor responde.</Text>
            {error && <Text type="danger" style={{ display: 'block', marginTop: 8 }}>{error}</Text>}
            {result && <ResultBlock result={result} />}
        </Card>
    );
};


const McpToolProbe = ({ probe }) => {
    const [args, setArgs] = useState(JSON.stringify(probe.defaultArguments, null, 2));
    const { loading, result, error, setError, setResult, run } = useMcpCall();

    const handleRun = () => {
        let parsedArgs;
        try {
            parsedArgs = JSON.parse(args);
        } catch (err) {
            setError(`JSON inválido en arguments: ${err.message}`);
            setResult(null);
            return;
        }
        run('tools/call', { name: probe.tool, arguments: parsedArgs });
    };

    return (
        <Card
            size="small"
            title={
                <Space size={8}>
                    <Tag color="magenta">tools/call</Tag>
                    <Text code>{probe.tool}</Text>
                    {probe.beta && <Tag color="gold">BETA</Tag>}
                </Space>
            }
            extra={<RunButton onClick={handleRun} loading={loading} />}
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>{probe.description}</Text>
            <Input.TextArea
                aria-label={`Argumentos de ${probe.tool}`}
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                autoSize={{ minRows: 3, maxRows: 14 }}
                style={{ fontFamily: 'monospace', fontSize: 11 }}
                spellCheck={false}
            />
            {error && <Text type="danger" style={{ display: 'block', marginTop: 8 }}>{error}</Text>}
            {result && <ResultBlock result={result} />}
        </Card>
    );
};


export default function McpPlayground() {
    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <McpRootProbe />
            {MCP_TOOL_PROBES.map((probe) => (
                <McpToolProbe key={probe.tool} probe={probe} />
            ))}
        </Space>
    );
}
