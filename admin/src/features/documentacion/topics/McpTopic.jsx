import { Card, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import McpPlayground from '@features/documentacion/topics/McpPlayground';

const { Title, Paragraph, Text } = Typography;


const MCP_URL = (() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/mapalab/mcp`;
    }
    return 'https://<dominio>/mapalab/mcp';
})();


const GRUPO_COLOR = {
    'búsqueda': 'geekblue',
    'capa': 'purple',
    'municipios': 'cyan',
    'datos': 'orange',
    'creación': 'volcano',
};

const TOOLS = [
    { grupo: 'búsqueda', tool: 'search_layers', modulo: 'mapalab.py', desc: 'Busca capas por texto o tema; devuelve el id que usan las demás.' },
    { grupo: 'capa', tool: 'describe_layer', modulo: 'layers.py', desc: 'Cualidades, metadata, numeralia y periodicidad de una capa.' },
    { grupo: 'municipios', tool: 'municipios', modulo: 'resolve.py', desc: 'Lista o busca municipios con su clave INEGI.' },
    { grupo: 'datos', tool: 'layer_table', modulo: 'tabla.py', desc: 'Filas legibles, filtrables y paginadas de una capa.' },
    { grupo: 'datos', tool: 'layer_stats', modulo: 'estadisticas.py', desc: 'Conteo, suma, promedio y reparto por clase.' },
    { grupo: 'creación', tool: 'create_map', modulo: 'shares.py', desc: 'Crea un mapa compartible con capas, municipio y año.' },
    { grupo: 'creación', tool: 'create_swipe', modulo: 'shares.py', desc: 'Comparador A|B de una capa en dos años o de dos capas.', beta: true },
];

const TOOL_COLUMNS = [
    {
        title: 'Grupo',
        dataIndex: 'grupo',
        key: 'grupo',
        width: 130,
        filters: Object.keys(GRUPO_COLOR).map((r) => ({ text: r, value: r })),
        onFilter: (value, row) => row.grupo === value,
        render: (value) => <Tag color={GRUPO_COLOR[value]}>{value}</Tag>,
    },
    {
        title: 'Tool',
        dataIndex: 'tool',
        key: 'tool',
        render: (value, row) => (
            <Space size={6}>
                <Text code>{value}</Text>
                {row.beta && <Tag color="gold">BETA</Tag>}
            </Space>
        ),
    },
    { title: 'Módulo', dataIndex: 'modulo', key: 'modulo', width: 140, render: (v) => <Text code>{v}</Text> },
    { title: 'Qué hace', dataIndex: 'desc', key: 'desc' },
];

const REGLAS = [
    { tema: 'Identificadores', regla: 'El id de search_layers; también acepta slug, alias o nombre parcial.' },
    { tema: 'Fechas', regla: 'year (o year_a/year_b), validado contra describe_layer.periodicidad; sin CQL.' },
    { tema: 'Municipios', regla: 'Nombre o clave directo, p. ej. municipio: "Guadalajara".' },
    { tema: 'Basemaps', regla: 'voyager, position o sin_mapalab.' },
    { tema: 'Errores', regla: 'Los de dominio llegan como error MCP (isError: true) con un mensaje accionable.' },
    { tema: 'Flujo', regla: 'search_layers → describe_layer → layer_table / layer_stats → create_map.' },
];

const REGLA_COLUMNS = [
    { title: 'Tema', dataIndex: 'tema', key: 'tema', width: 150, render: (v) => <Text strong>{v}</Text> },
    { title: 'Regla', dataIndex: 'regla', key: 'regla' },
];


export default function McpTopic() {
    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Servidor MCP</Title>
                <Text type="secondary">
                    Siete tools públicas, sin API key, para que un agente busque capas, consulte sus datos y entregue un mapa.
                </Text>
                <Paragraph style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }} copyable={{ text: MCP_URL }}>
                    URL del entorno actual: <Text code>{MCP_URL}</Text>
                </Paragraph>
            </div>

            <Card
                title={<>Tools disponibles <Tag style={{ marginLeft: 8 }}>{TOOLS.length}</Tag></>}
                size="small"
                extra={
                    <Tooltip title="create_swipe y el parámetro vista_3d solo existen en dev y beta, como el comparador del visor.">
                        <InfoCircleOutlined aria-label="Qué es BETA" />
                    </Tooltip>
                }
            >
                <Table rowKey="tool" size="small" pagination={false} dataSource={TOOLS} columns={TOOL_COLUMNS} />
            </Card>

            <Card title="Guía rápida para agentes" size="small">
                <Table rowKey="tema" size="small" pagination={false} showHeader={false} dataSource={REGLAS} columns={REGLA_COLUMNS} />
            </Card>

            <div>
                <Title level={4} style={{ marginBottom: 4 }}>Probar endpoints</Title>
                <Text type="secondary">Llamadas JSON-RPC al MCP de este entorno; edita los argumentos y prueba.</Text>
            </div>

            <McpPlayground />
        </Space>
    );
}
