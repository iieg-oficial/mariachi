import { Alert, Card, Space, Table, Tabs, Tag, Typography } from 'antd';
import PluginQgisInstalacion from '@features/documentacion/components/PluginQgisInstalacion';

const { Title, Paragraph, Text } = Typography;

const FILAS = [
    {
        tipo: 'tema',
        seVe: 'Negrita, ícono grande y barra de acento al abrirse.',
        hace: 'Agrupa el catálogo. Se pliega.',
    },
    {
        tipo: 'category',
        seVe: 'Gris tenue, un punto más chica. Se realza en negrita, sin fondo.',
        hace: 'Sólo ordena. Nace abierta y se pliega.',
    },
    {
        tipo: 'label',
        seVe: 'Negrita en el morado de la marca.',
        hace: 'Encabezado de sección. No se pliega: sus capas cuelgan siempre.',
    },
    {
        tipo: 'group',
        seVe: 'Casilla al inicio de la fila.',
        hace: 'Marcarla trae el grupo completo; desmarcarla lo retira.',
    },
    {
        tipo: 'leaf',
        seVe: 'Glifo de geometría a la derecha y aspa a la izquierda si está en el mapa.',
        hace: 'Es una capa. El aspa la retira del proyecto.',
    },
];

const FILA_COLUMNS = [
    { title: 'nodeType', dataIndex: 'tipo', key: 'tipo', width: 120, render: (v) => <Text code>{v}</Text> },
    { title: 'Cómo se ve en QGIS', dataIndex: 'seVe', key: 'seVe', width: 320 },
    { title: 'Qué hace', dataIndex: 'hace', key: 'hace' },
];

const CAMPOS = [
    {
        campo: 'nodeType',
        donde: 'Editor de capas · tipo de nodo',
        efecto: 'Decide si la fila es encabezado, categoría, grupo marcable o capa. Marcar un nodo como group es lo que le pone casilla.',
    },
    {
        campo: 'cqlFilter',
        donde: 'Editor de capas · filtro',
        efecto: 'El plugin lo aplica al agregar y al descargar: el nodo trae lo suyo, no la tabla entera.',
    },
    {
        campo: 'geometry_type',
        donde: 'Editor de capas · tipo de geometría',
        efecto: 'Pinta el glifo de punto, línea, polígono o ráster. Sin él, la fila queda sin glifo.',
    },
    {
        campo: 'Módulo Identidad',
        donde: 'Identidad · tokens y logos',
        efecto: 'De ahí salen los colores, la tipografía y los logos del panel. El plugin no lleva ninguno propio.',
    },
];

const CAMPO_COLUMNS = [
    { title: 'Qué se administra', dataIndex: 'campo', key: 'campo', width: 180, render: (v) => <Text code>{v}</Text> },
    { title: 'Dónde se edita', dataIndex: 'donde', key: 'donde', width: 260 },
    { title: 'Qué cambia en el plugin', dataIndex: 'efecto', key: 'efecto' },
];

const ACCIONES = [
    { accion: 'Ver una capa', como: 'Seleccionarla y «Agregar al mapa», o doble clic. Entra como WMS en modo tile.' },
    { accion: 'Ver un grupo entero', como: 'Marcar su casilla. Los nodos de la misma tabla entran como una sola capa con sus filtros combinados.' },
    { accion: 'Traer la tabla completa', como: 'Marcar «Traer la tabla completa» antes de agregar: ignora el filtro del catálogo.' },
    { accion: 'Consultar un elemento', como: 'Con el panel abierto, clic en el lienzo. Consulta la capa elegida en el árbol, esté cargada o no.' },
    { accion: 'Analizar los datos', como: '«Descargar vectorial» deja un GeoPackage local, ya filtrado por el nodo.' },
    { accion: 'Cambiar de límites', como: 'El switch IIEG | INEGI de la barra: mueve las capas de límites y cambia la geometría con la que se dibuja todo lo demás.' },
];

const ACCION_COLUMNS = [
    { title: 'Para', dataIndex: 'accion', key: 'accion', width: 220, render: (v) => <Text strong>{v}</Text> },
    { title: 'Cómo', dataIndex: 'como', key: 'como' },
];

function UsoTab() {
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>

            <Card size="small" title="Qué se puede hacer">
                <Table
                    dataSource={ACCIONES}
                    columns={ACCION_COLUMNS}
                    rowKey="accion"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Card size="small" title="Cómo se lee el árbol">
                <Table
                    dataSource={FILAS}
                    columns={FILA_COLUMNS}
                    rowKey="tipo"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Alert
                type="info"
                showIcon
                message="Lo que se administra aquí se ve allá"
                description="El plugin no tiene catálogo propio: lee el mismo árbol que el visor. Un cambio de tipo de nodo, de filtro o de tipo de geometría cambia cómo se ve y qué trae la capa en QGIS, sin desplegar nada."
            />

            <Card size="small" title="Qué campo afecta a qué">
                <Table
                    dataSource={CAMPOS}
                    columns={CAMPO_COLUMNS}
                    rowKey="campo"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Card size="small" title="La consulta por clic">
                <Paragraph style={{ marginBottom: 8 }}>
                    Las capas WMS son imágenes y no se seleccionan, pero sextante responde <Text code>GetFeatureInfo</Text>
                    {' '}con la geometría del elemento. Con eso, el clic copia lo consultado a una capa en memoria
                    <Text code> Selección — &lt;capa&gt;</Text>, lo deja seleccionado y abre su ficha de atributos. De ahí
                    en adelante es una capa normal: zoom a la selección, copiar o exportar a GeoPackage.
                </Paragraph>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Manda a la vez lo elegido en el árbol, la capa activa de QGIS y, si no hay ninguna, la primera que
                    responda de arriba abajo. Los clics se acumulan y volver a uno ya consultado no lo duplica.
                </Paragraph>
            </Card>

            <Alert
                type="warning"
                showIcon
                message="Antes de publicarlo fuera de la red"
                description={
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>El tráfico del plugin pasa por el gateway, no por la URL interna de GeoServer: eso es lo que le da cache, rate limit y protección de bots.</li>
                        <li>Falta declarar el User-Agent de QGIS en la allowlist del gateway; hoy pasa por accidente, no por regla.</li>
                        <li>Falta su propia zona de rate limit: hoy comparte la del visor, y el límite es por IP de salida.</li>
                    </ul>
                }
            />

            <Space size={8} wrap>
                <Tag color="purple">mapalab · plugin/</Tag>
                <Tag color="purple">QGIS 3.40 LTR</Tag>
                <Tag color="purple">sólo lectura</Tag>
            </Space>
        </Space>
    );
}

export default function PluginQgisTab() {
    const items = [
        { key: 'instalacion', label: 'Instalación', children: <PluginQgisInstalacion /> },
        { key: 'uso', label: 'Uso y administración', children: <UsoTab /> },
    ];

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
                <Title level={4} style={{ marginTop: 0 }}>Plugin de QGIS</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Lleva el catálogo del visor a QGIS: el mismo árbol de temas, el mismo buscador y la misma
                    identidad, sin teclear una URL de WMS ni saber qué es un workspace. Es de sólo lectura y
                    todo lo que consume ya es público en el visor, así que no pide credenciales.
                </Paragraph>
            </div>
            <Tabs items={items} defaultActiveKey="instalacion" />
        </Space>
    );
}
