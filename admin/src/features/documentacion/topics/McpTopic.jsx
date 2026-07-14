import { Card, Space, Table, Tag, Typography } from 'antd';
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
    'features': 'orange',
    'creación': 'volcano',
};

const TOOLS = [
    { grupo: 'búsqueda', tool: 'search_layers', modulo: 'resolve.py', desc: 'Punto de entrada: busca por texto/id/slug y/o por tema (theme). Devuelve el id que usan los demás tools.', highlight: true },
    { grupo: 'capa', tool: 'describe_layer', modulo: 'layers.py', desc: 'Retrato completo de una capa: capabilities + metadata + numeralia + periodicidad (años/meses) en una llamada. Ids difusos.', highlight: true },
    { grupo: 'municipios', tool: 'municipios', modulo: 'resolve.py', desc: 'Lista los 125 municipios o filtra por nombre/clave. Devuelve la clave INEGI.' },
    { grupo: 'features', tool: 'query_wfs', modulo: 'layers.py', desc: 'Features reales (WFS) de una capa, con filtros por municipio/año/mes (sin CQL) o cql_filter avanzado.' },
    { grupo: 'creación', tool: 'create_map', modulo: 'shares.py', desc: 'Crea un mapa de un panel. Modo búsqueda (query/theme) o directo (layers) + municipio/año/anotaciones. Valida el año contra la periodicidad.', highlight: true },
    { grupo: 'creación', tool: 'create_swipe', modulo: 'shares.py', desc: 'Comparativo A|B: una capa en dos años (layer + year_a/year_b) o dos capas (pane_a/pane_b, con año por lado opcional). Valida el año.', highlight: true },
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
            <Text code style={row.highlight ? { color: '#5C2472', fontWeight: 600 } : undefined}>
                {value}
            </Text>
        ),
    },
    { title: 'Módulo', dataIndex: 'modulo', key: 'modulo', width: 120, render: (v) => <Text code>{v}</Text> },
    { title: 'Qué hace', dataIndex: 'desc', key: 'desc' },
];


export default function McpTopic() {
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Servidor MCP</Title>
                <Text type="secondary">
                    El servidor MCP de MapaLab expone 6 tools enfocadas en crear mapas, que un agente LLM (Claude Desktop, IGIBot, etc.) puede usar para buscar capas, conocerlas y entregar el mapa como respuesta.
                </Text>
                <Paragraph style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }} copyable={{ text: MCP_URL }}>
                    URL del entorno actual: <Text code>{MCP_URL}</Text>
                </Paragraph>
            </div>

            <Card
                title={<>Tools disponibles <Tag style={{ marginLeft: 8 }}>{TOOLS.length}</Tag></>}
                size="small"
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Filtra por router en el header</Text>}
            >
                <Table
                    rowKey="tool"
                    size="small"
                    pagination={false}
                    dataSource={TOOLS}
                    columns={TOOL_COLUMNS}
                />
            </Card>

            <div>
                <Title level={4} style={{ marginBottom: 4 }}>Probar endpoints</Title>
                <Text type="secondary">
                    Llama los tools del MCP vía JSON-RPC. Las tarjetas <Text code>create_map</Text> y <Text code>create_swipe</Text> embeben el mapa resultante si pegas una API key arriba. Telemetría persistida en el tema <Text code>Telemetría</Text>.
                </Text>
            </div>

            <Card title="Guía rápida para agentes" size="small" style={{ marginTop: 0 }}>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                    <li><Text strong>Identificadores:</Text> usa siempre el <Text code>id</Text> que devuelve <Text code>search_layers</Text> (p. ej. <Text code>homicidio_doloso</Text>). El workspace se resuelve solo; no hace falta pasarlo. También acepta ids difusos: slug, alias o nombre parcial.</li>
                    <li><Text strong>Basemaps:</Text> <Text code>voyager</Text> (recomendado), <Text code>position</Text> (mapa gris), <Text code>sin_mapalab</Text>. No usar <Text code>osm</Text>. Rechazado automáticamente por Pydantic.</li>
                    <li><Text strong>Filtros de fecha:</Text> los años disponibles salen en <Text code>describe_layer(...).periodicidad.años</Text>. No escribas CQL: pasa <Text code>year</Text> a <Text code>create_map</Text>, o <Text code>year_a</Text>/<Text code>year_b</Text> a <Text code>create_swipe</Text>; el server arma el filtro y valida el año (error accionable si no existe). En <Text code>query_wfs</Text> usa <Text code>year</Text> y <Text code>month</Text>.</li>
                    <li><Text strong>Anotaciones:</Text> <Text code>LineString</Text>, <Text code>Polygon</Text>, <Text code>Emoji</Text> (<Text code>textLabel: "📍"</Text>), <Text code>Text</Text>. En swipe son globales (ambos lados).</li>
                    <li><Text strong>Municipios:</Text> pasa el nombre o la clave directo — <Text code>create_map(municipio:"Guadalajara")</Text>, <Text code>create_swipe(municipio:"14039")</Text>, <Text code>query_wfs(municipio:"Guadalajara")</Text>. Usa <Text code>municipios(query)</Text> solo si necesitas buscar la clave.</li>
                    <li><Text strong>Auto-encuadre:</Text> no hace falta pasar <Text code>view</Text>. Si pasas <Text code>municipio</Text>, se encuadra a ese municipio; si no, a Jalisco.</li>
                    <li><Text strong>Una llamada para conocer la capa:</Text> <Text code>describe_layer</Text> trae capabilities + metadata + numeralia + periodicidad juntas (ideal para modelos chicos).</li>
                    <li><Text strong>Flujo típico:</Text> <Text code>search_layers → describe_layer → (municipios) → create_map / create_swipe</Text>.</li>
                </ul>
            </Card>

            <McpPlayground />
        </Space>
    );
}
