import { Card, Space, Table, Tag, Typography } from 'antd';
import {
    ADOPCION,
    CAMPOS,
    EJEMPLO_RESPUESTA,
    ESTADOS,
    ESTADO_COLORS,
    FORMAS,
    NODO_VARS,
} from '@features/documentacion/topics/contratos/ontoyData';

const { Paragraph, Text } = Typography;

const codeBlockStyle = {
    margin: 0,
    padding: 12,
    background: '#f6f6f8',
    borderRadius: 6,
    fontSize: 12,
    lineHeight: 1.6,
    overflowX: 'auto',
};

const chico = { fontSize: 12 };
const nota = { marginTop: 12, marginBottom: 0, fontSize: 12 };

const codigo = (v) => <Text code>{v}</Text>;
const menudo = (v) => <Text style={chico}>{v}</Text>;

const CAMPO_COLUMNS = [
    { title: 'Campo', dataIndex: 'campo', key: 'campo', width: 140, render: codigo },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 150, render: menudo },
    { title: 'Obligatorio', dataIndex: 'obligatorio', key: 'obligatorio', width: 100 },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion' },
];

const ESTADO_COLUMNS = [
    {
        title: 'status',
        dataIndex: 'estado',
        key: 'estado',
        width: 110,
        render: (v) => <Tag color={ESTADO_COLORS[v]}>{v}</Tag>,
    },
    { title: 'HTTP', dataIndex: 'http', key: 'http', width: 70, render: codigo },
    { title: 'Qué significa', dataIndex: 'afecta', key: 'afecta' },
];

const NODO_COLUMNS = [
    { title: 'Variable', dataIndex: 'variable', key: 'variable', width: 210, render: codigo },
    { title: 'Obligatoria', dataIndex: 'obligatoria', key: 'obligatoria', width: 110 },
    { title: 'Para qué', dataIndex: 'para', key: 'para' },
];

const FORMA_COLUMNS = [
    { title: 'Forma', dataIndex: 'forma', key: 'forma', width: 210 },
    { title: 'Cómo', dataIndex: 'como', key: 'como', render: menudo },
    { title: 'Quién', dataIndex: 'quien', key: 'quien', render: menudo },
];

const ADOPCION_COLUMNS = [
    { title: 'Servicio', dataIndex: 'servicio', key: 'servicio', width: 120, render: codigo },
    { title: 'Nodo', dataIndex: 'nodo', key: 'nodo', width: 140, render: menudo },
    { title: 'Cómo lo sirve', dataIndex: 'como', key: 'como', render: menudo },
    { title: 'Checks', dataIndex: 'checks', key: 'checks', render: menudo },
];


export default function OntoyTopic() {
    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Identidad y salud de cada servicio. Lo consumen el monitor de Huachicol y las tarjetas del Inicio.
            </Paragraph>

            <Card title="Respuesta" size="small">
                <pre style={codeBlockStyle}>{EJEMPLO_RESPUESTA}</pre>
                <Table
                    rowKey="campo"
                    size="small"
                    pagination={false}
                    dataSource={CAMPOS}
                    columns={CAMPO_COLUMNS}
                    style={{ marginTop: 16 }}
                />
                <Paragraph type="secondary" style={nota}>
                    La versión sale del repo, no del release: verificar con <Text code>&gt;= X</Text>, nunca <Text code>= X</Text>.
                </Paragraph>
            </Card>

            <Card title="Estados" size="small">
                <Table
                    rowKey="estado"
                    size="small"
                    pagination={false}
                    dataSource={ESTADOS}
                    columns={ESTADO_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    Los checks <Text code>informativo: true</Text> —<Text code>carga</Text>, <Text code>memoria</Text>, <Text code>swap</Text>, <Text code>temperatura</Text>, <Text code>peer_*</Text>— no cuentan para el estado global. Un <Text code>status</Text> inválido se normaliza a <Text code>ok</Text>.
                </Paragraph>
            </Card>

            <Card title="Identidad del nodo" size="small">
                <Table
                    rowKey="variable"
                    size="small"
                    pagination={false}
                    dataSource={NODO_VARS}
                    columns={NODO_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    <strong>Un solo reportero por nodo</strong>; el de S1 es huachicol. Las aristas acotan la conexión pero no la resolución de nombres: un vecino que no resuelva cuesta lo que tarde el DNS.
                </Paragraph>
            </Card>

            <Card title="Las tres formas de servirlo" size="small">
                <Table
                    rowKey="forma"
                    size="small"
                    pagination={false}
                    dataSource={FORMAS}
                    columns={FORMA_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    Los siete <Text code>ontoy_server.py</Text> son idénticos byte a byte (<Text code>md5sum */version-api/ontoy_server.py</Text>). El socket de Docker va <strong>en el sidecar, nunca en la aplicación</strong>.
                </Paragraph>
            </Card>

            <Card title="Exposición" size="small">
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 0, ...chico }}>
                    El monitor sondea por <Text code>iieg-network</Text>: un <Text code>/ontoy</Text> del backend no necesita ser público. <strong>El <Text code>deny</Text> va en el gateway</strong>, porque el rewrite le quita el prefijo antes de que el nginx del servicio lo vea. Al verificar, usar <Text code>User-Agent</Text> de navegador: el anti-bots responde <Text code>403</Text> a <Text code>curl</Text>.
                </Paragraph>
            </Card>

            <Card title="Qué guarda el monitor" size="small">
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 0, ...chico }}>
                    Persiste <Text code>status</Text>, <Text code>checks</Text>, <Text code>containers</Text>, <Text code>version</Text>, <Text code>deployed_at</Text>, <Text code>node</Text> y <Text code>host</Text>; ignora <Text code>service</Text>, <Text code>released_at</Text> y <Text code>peers</Text>. Por eso lo que se vigile va <strong>como un check con su propio <Text code>status</Text></strong>, contado sobre una ventana de minutos y fuera de la memoria del worker.
                </Paragraph>
            </Card>

            <Card title="Estado de adopción" size="small">
                <Table
                    rowKey="servicio"
                    size="small"
                    pagination={false}
                    dataSource={ADOPCION}
                    columns={ADOPCION_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    Completo en <Text code>context-ame-esta/repos/huachicol/ontoy-contrato.md</Text>.
                </Paragraph>
            </Card>
        </Space>
    );
}
