import { Card, Space, Table, Typography } from 'antd';
import {
    CLAVE_POBLADO,
    DDL_FECHA,
    TIPOS_FECHA,
    GRANULARIDAD,
    EJEMPLOS,
    NO_CONTRATO,
    CQL_BBOX,
    CQL_FECHA,
    DIALECTOS,
    GEOMETRIA,
    OTRAS_FECHAS,
    QUIEN_BUSCA_FECHA,
    SCHEMAS_EXCLUIDOS,
    VERIFICACIONES,
} from '@features/documentacion/topics/contratos/baseDatosData';

const { Paragraph, Text } = Typography;

const codeBlockStyle = {
    margin: 0,
    padding: 12,
    background: '#f6f6f8',
    borderRadius: 6,
    fontSize: 12,
    lineHeight: 1.6,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
};

const chico = { fontSize: 12 };
const nota = { marginTop: 12, marginBottom: 0, fontSize: 12 };

const codigo = (v) => <Text code style={chico}>{v}</Text>;
const menudo = (v) => <Text style={chico}>{v}</Text>;

const EJEMPLO_COLUMNS = [
    { title: 'Columna', dataIndex: 'columna', key: 'columna', width: 180, render: codigo },
    { title: 'Formato', dataIndex: 'formato', key: 'formato', render: menudo },
    { title: 'Ejemplo', dataIndex: 'ejemplo', key: 'ejemplo', render: codigo },
];

const NO_CONTRATO_COLUMNS = [
    { title: 'Columna', dataIndex: 'columna', key: 'columna', width: 200, render: codigo },
    { title: 'Por qué no lo es', dataIndex: 'porque', key: 'porque' },
];

const TIPO_COLUMNS = [
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 220, render: codigo },
    { title: 'Sirve', dataIndex: 'sirve', key: 'sirve', width: 150 },
    { title: 'Qué pasa', dataIndex: 'nota', key: 'nota', render: menudo },
];

const GRANULARIDAD_COLUMNS = [
    { title: 'Granularidad', dataIndex: 'caso', key: 'caso', width: 150 },
    { title: 'Cómo se guarda', dataIndex: 'guarda', key: 'guarda', render: codigo },
    { title: 'Capas hoy', dataIndex: 'capas', key: 'capas', width: 110 },
];

const PIEZA_COLUMNS = [
    { title: 'Quién la busca', dataIndex: 'pieza', key: 'pieza', width: 210 },
    { title: 'Cómo', dataIndex: 'como', key: 'como', width: 250, render: codigo },
    { title: 'Si se llama de otro modo', dataIndex: 'rompe', key: 'rompe', render: menudo },
];

const OTRAS_COLUMNS = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', width: 230, render: codigo },
    { title: 'Qué es', dataIndex: 'que', key: 'que' },
    { title: 'Formato', dataIndex: 'formato', key: 'formato', render: menudo },
];

const CLAVE_COLUMNS = [
    { title: 'Situación', dataIndex: 'caso', key: 'caso', width: 220 },
    { title: 'Cómo se puebla', dataIndex: 'como', key: 'como', render: menudo },
    { title: 'Ejemplo', dataIndex: 'ejemplo', key: 'ejemplo', render: codigo },
];

const GEOMETRIA_COLUMNS = [
    { title: 'Columna', dataIndex: 'columna', key: 'columna', width: 130, render: codigo },
    { title: 'Qué es', dataIndex: 'que', key: 'que', width: 280 },
    { title: 'Quién depende del nombre', dataIndex: 'quien', key: 'quien', render: menudo },
];

const DIALECTO_COLUMNS = [
    { title: 'Dónde', dataIndex: 'tabla', key: 'tabla', width: 300, render: menudo },
    { title: 'Llave', dataIndex: 'llave', key: 'llave', render: codigo },
    { title: 'Identifica', dataIndex: 'identifica', key: 'identifica', width: 170 },
];

const VERIFICACION_COLUMNS = [
    { title: 'Qué se comprueba', dataIndex: 'que', key: 'que', width: 250 },
    {
        title: 'Consulta',
        dataIndex: 'sql',
        key: 'sql',
        render: (v) => <pre style={{ ...codeBlockStyle, fontSize: 11 }}>{v}</pre>,
    },
];


export default function BaseDatosTopic() {
    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Se cumplen por nombre y no los valida nadie. Una columna mal nombrada no da error: da una capa vacía o un selector sin meses.
            </Paragraph>

            <Card title="Formato de cada columna" size="small">
                <Table
                    rowKey="columna"
                    size="small"
                    pagination={false}
                    dataSource={EJEMPLOS}
                    columns={EJEMPLO_COLUMNS}
                />
            </Card>

            <Card title="No son contrato, aunque lo parezcan" size="small">
                <Table
                    rowKey="columna"
                    size="small"
                    pagination={false}
                    dataSource={NO_CONTRATO}
                    columns={NO_CONTRATO_COLUMNS}
                />
            </Card>

            <Card title={<>La columna temporal se llama <Text code>fecha</Text></>} size="small">
                <Table
                    rowKey="pieza"
                    size="small"
                    pagination={false}
                    dataSource={QUIEN_BUSCA_FECHA}
                    columns={PIEZA_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    Minúsculas, singular, sin sufijos, y de tipo <Text code>date</Text>. Un texto que no castee no aborta el refresh: deja un <Text code>WARNING</Text> y esa capa se queda sin periodicidad. Schemas que la función no mira: {menudo(SCHEMAS_EXCLUIDOS)}.
                </Paragraph>
            </Card>

            <Card title="Cómo debe ir la columna" size="small">
                <pre style={codeBlockStyle}>{DDL_FECHA}</pre>
                <Table
                    rowKey="tipo"
                    size="small"
                    pagination={false}
                    dataSource={TIPOS_FECHA}
                    columns={TIPO_COLUMNS}
                    style={{ marginTop: 16 }}
                />
                <Paragraph type="secondary" style={nota}>
                    <Text code>NULL</Text> se permite: esas filas no aportan periodos. La columna tiene que estar <strong>publicada en el featuretype</strong>, o el CQL falla con la base bien. <strong>El índice no lo tiene ninguna</strong> de las 103 relaciones con <Text code>fecha</Text>: el filtro se resuelve hoy con recorrido secuencial.
                </Paragraph>
            </Card>

            <Card title="Anual, mensual o diaria es granularidad, no tipo" size="small">
                <Table
                    rowKey="caso"
                    size="small"
                    pagination={false}
                    dataSource={GRANULARIDAD}
                    columns={GRANULARIDAD_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    Un año suelto no sirve: <Text code>&apos;2026&apos;</Text> y <Text code>2026</Text> revientan el cast, el error se traga solo y la capa se queda sin periodicidad. Hoy <Text code>eventos.eventos</Text> guarda <Text code>11/06/2026</Text> y por eso no aparece en el selector.
                </Paragraph>
            </Card>

            <Card title="El CQL de fecha es la llave del caché de GWC" size="small">
                <pre style={codeBlockStyle}>{CQL_FECHA}</pre>
                <Paragraph type="secondary" style={nota}>
                    GWC lo compara <strong>byte a byte</strong>: un espacio de diferencia y la capa deja de cachear, sin más síntoma que la lentitud.
                </Paragraph>
            </Card>

            <Card title="Tres cosas que se llaman fecha y no son esa columna" size="small">
                <Table
                    rowKey="nombre"
                    size="small"
                    pagination={false}
                    dataSource={OTRAS_FECHAS}
                    columns={OTRAS_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    <strong>Un año suelto sí vale, pero solo en <Text code>fecha_ultima</Text></strong>, que es metadato: 42 de las 130 filas lo usan y el campo del editor lo autoriza. En la columna <Text code>fecha</Text> no: <Text code>&apos;2026&apos;::date</Text> falla.
                </Paragraph>
                <Paragraph type="secondary" style={nota}>
                    En la tarjetita el formato lo decide <strong>la etiqueta, no el dato</strong>: un label con «Fecha» pinta <Text code>YYYY-MM-DD</Text> y uno con «Año de la información», solo el año.
                </Paragraph>
            </Card>

            <Card title={<>La clave de municipio son cinco dígitos: <Text code>clave_municipio</Text> y <Text code>clave_geo</Text></>} size="small">
                <Table
                    rowKey="caso"
                    size="small"
                    pagination={false}
                    dataSource={CLAVE_POBLADO}
                    columns={CLAVE_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    <Text code>varchar(5)</Text> con prefijo de estado, de <Text code>14001</Text> a <Text code>14125</Text>, contra <Text code>mapalab.municipios.clave_geo</Text>. <strong>El nombre de la columna no prueba nada</strong>: una candidata solo se acepta si el 90 % de sus valores empata.
                </Paragraph>
                <Paragraph type="secondary" style={nota}>
                    Después faltan tres pasos que no son SQL: recargar el catálogo de GeoServer, declarar <Text code>municipio_field</Text> y <Text code>municipio_field_type</Text>, y correr <Text code>make refresh-layer-tree</Text>. Sin eso la capa cae en el rectángulo envolvente, que quema nombre y SRID:
                </Paragraph>
                <pre style={{ ...codeBlockStyle, marginTop: 8 }}>{CQL_BBOX}</pre>
            </Card>

            <Card title="Geometría y SRID" size="small">
                <Table
                    rowKey="columna"
                    size="small"
                    pagination={false}
                    dataSource={GEOMETRIA}
                    columns={GEOMETRIA_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    Sin el parameter filter <Text code>ENV</Text> declarado con esos dos valores exactos, GWC ni procesa la petición.
                </Paragraph>
            </Card>

            <Card title={<>Toda relación publicada por WFS necesita <Text code>fid</Text></>} size="small">
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 0, ...chico }}>
                    Sin él, GeoServer rechaza con <Text code>400</Text> todo <Text code>GetFeature</Text> con <Text code>STARTINDEX</Text> y la consulta se queda en la primera página. En una vista basta <Text code>row_number() OVER () AS fid</Text>; en una materializada, reconstruirla y ponerle <Text code>CREATE UNIQUE INDEX (fid)</Text>.
                </Paragraph>
            </Card>

            <Card title="La llave de capa tiene dos dialectos" size="small">
                <Table
                    rowKey="tabla"
                    size="small"
                    pagination={false}
                    dataSource={DIALECTOS}
                    columns={DIALECTO_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    Para <Text code>general</Text> difieren: <Text code>general</Text> en GeoServer, <Text code>mapa_base</Text> en la base. Si el nombre de la capa no es el de su tabla, <strong>la periodicidad no se encuentra</strong>.
                </Paragraph>
            </Card>

            <Card title="Valores, permisos y copias" size="small">
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 8, ...chico }}>
                    <strong>Multivalor:</strong> separador <Text code>; </Text>, nunca coma —aparece dentro de valores legítimos como <Text code>Zapopan, Jal.</Text>—. Quien lee parte estricto, sin respaldo.
                </Paragraph>
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 8, ...chico }}>
                    <strong>Permisos:</strong> un schema nuevo no hereda nada y un restore los borra sin tocar <Text code>alembic_version</Text>. El síntoma: el <Text code>GET</Text> funciona y el <Text code>POST</Text> da 500.
                </Paragraph>
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 0, ...chico }}>
                    <strong>Copias:</strong> las constantes de la numeralia viven en tres —mapalab, mariachi y el job— sin verificación. Un operador agregado solo aquí falla en el cron de las 04:30.
                </Paragraph>
            </Card>

            <Card title="Cómo verificarlo" size="small">
                <Table
                    rowKey="que"
                    size="small"
                    pagination={false}
                    dataSource={VERIFICACIONES}
                    columns={VERIFICACION_COLUMNS}
                />
                <Paragraph type="secondary" style={nota}>
                    La comprobación buena es <strong>lanzar el CQL real por WFS</strong>, no mirar la columna. Completo en <Text code>context-ame-esta/ecosistema/contratos-de-datos.md</Text>.
                </Paragraph>
            </Card>
        </Space>
    );
}
