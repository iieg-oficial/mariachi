import { Card, Space, Table, Tag, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;


const CAMPOS = [
    { campo: 'service', tipo: 'string', descripcion: 'Identificador del servicio' },
    { campo: 'version', tipo: 'string', descripcion: 'Versión del repo desplegada' },
    { campo: 'released_at', tipo: 'date', descripcion: 'Fecha del release según el CHANGELOG' },
    { campo: 'deployed_at', tipo: 'datetime ISO', descripcion: 'Cuándo se desplegó realmente este artefacto' },
    { campo: 'status', tipo: 'ok | degraded | down', descripcion: 'Peor resultado entre todos los checks' },
    { campo: 'checks', tipo: 'objeto', descripcion: 'Resultado por verificación, cada uno con su status' },
    { campo: 'containers', tipo: 'array', descripcion: 'Contenedores del proyecto en ese host' },
];

const CAMPO_COLUMNS = [
    { title: 'Campo', dataIndex: 'campo', key: 'campo', render: (v) => <Text code>{v}</Text> },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 150, render: (v) => <Text style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion' },
];

const ESTADOS = [
    { estado: 'ok', http: '200', afecta: 'Nada. El servicio y sus dependencias responden.' },
    { estado: 'degraded', http: '200', afecta: 'El servicio funciona pero algo está mal: disco al 85%, un contenedor no esencial detenido. Requiere atención, no es urgencia.' },
    { estado: 'down', http: '503', afecta: 'El servicio no puede cumplir su función: base de datos caída, disco al 95%, dependencia crítica ausente.' },
];

const ESTADO_COLORS = { ok: 'success', degraded: 'warning', down: 'error' };

const ESTADO_COLUMNS = [
    {
        title: 'status',
        dataIndex: 'estado',
        key: 'estado',
        width: 110,
        render: (v) => <Tag color={ESTADO_COLORS[v]}>{v}</Tag>,
    },
    { title: 'HTTP', dataIndex: 'http', key: 'http', width: 70, render: (v) => <Text code>{v}</Text> },
    { title: 'Qué está afectando', dataIndex: 'afecta', key: 'afecta' },
];

const ADOPCION = [
    { servicio: 'huachicol', v2: true, como: 'sidecar version-api' },
    { servicio: 'geoserver', v2: false, como: 'sidecar version-api' },
    { servicio: 'acervo', v2: false, como: 'sidecar version-api' },
    { servicio: 'dataengine', v2: false, como: 'sidecar en jobs/' },
    { servicio: 'mapalab', v2: false, como: 'backend FastAPI' },
    { servicio: 'mariachi', v2: false, como: 'backend FastAPI' },
    { servicio: 'gateway-hub', v2: false, como: 'nginx (estático)' },
    { servicio: 'sieej', v2: false, como: 'estático vía gateway' },
];

const ADOPCION_COLUMNS = [
    { title: 'Servicio', dataIndex: 'servicio', key: 'servicio', render: (v) => <Text code>{v}</Text> },
    {
        title: 'Contrato v2',
        dataIndex: 'v2',
        key: 'v2',
        width: 120,
        render: (v) => <Tag color={v ? 'success' : 'default'}>{v ? 'sí' : 'pendiente'}</Tag>,
    },
    { title: 'Cómo lo sirve', dataIndex: 'como', key: 'como' },
];

const EJEMPLO_RESPUESTA = `{
  "service": "huachicol",
  "version": "1.24.0",
  "released_at": "2026-07-20",
  "deployed_at": "2026-07-20T21:21:47Z",
  "status": "ok",
  "checks": {
    "disk":       { "status": "ok", "used_percent": 51.4, "free_gb": 408.1 },
    "containers": { "status": "ok", "total": 10, "running": 10 }
  },
  "containers": [
    { "name": "prometheus", "state": "running", "health": "healthy",
      "image": "prom/prometheus:v3.2.1", "project": "huachicol" }
  ]
}`;

const EJEMPLO_FASTAPI = `@app.get("/ontoy")
async def ontoy():
    checks = {"db": await _check_db()}
    status = _worst(c["status"] for c in checks.values())
    payload = {
        "service": "mapalab",
        "version": APP_VERSION,
        "deployed_at": DEPLOYED_AT,
        "status": status,
        "checks": checks,
    }
    return JSONResponse(payload, status_code=503 if status == "down" else 200)`;

const codeBlockStyle = {
    margin: 0,
    padding: 12,
    background: '#f6f6f8',
    borderRadius: 6,
    fontSize: 12,
    lineHeight: 1.6,
    overflowX: 'auto',
};


export default function OntoyTopic() {
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Contrato <Text code>/ontoy</Text></Title>
                <Text type="secondary">
                    Endpoint de identidad y salud que expone cada servicio del ecosistema. Lo consumen el monitor de Huachicol y las tarjetas de plataformas del Inicio. La v2 sólo agrega campos sobre la v1, así que los consumidores existentes siguen funcionando y cada repo migra a su ritmo.
                </Text>
            </div>

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
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    <Text code>released_at</Text> es la fecha del release; <Text code>deployed_at</Text> es cuándo se desplegó. Se puede redesplegar sin cambiar de versión, así que para &quot;última actualización&quot; va <Text code>deployed_at</Text>.
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
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    El <Text code>status</Text> global es el peor de los checks: con uno solo en <Text code>down</Text>, el servicio está <Text code>down</Text>. El <Text code>503</Text> permite detectar el fallo sin parsear el cuerpo, que siempre es JSON válido para no perder el diagnóstico.
                </Paragraph>
            </Card>

            <Card title="Integrar un servicio" size="small">
                <Paragraph style={{ marginTop: 0, marginBottom: 8 }}>
                    Si el servicio ya sirve <Text code>/ontoy</Text> desde su backend, agregar <Text code>status</Text> y <Text code>checks</Text> al handler:
                </Paragraph>
                <pre style={codeBlockStyle}>{EJEMPLO_FASTAPI}</pre>
                <Paragraph style={{ marginTop: 16, marginBottom: 4 }}>
                    Si no, copiar <Text code>version-api/ontoy_server.py</Text> de Huachicol como sidecar y configurarlo con <Text code>ONTOY_SERVICE</Text>, <Text code>ONTOY_COMPOSE_PROJECT</Text> y <Text code>ONTOY_DISK_PATH</Text>.
                </Paragraph>
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    Para reportar contenedores hace falta montar <Text code>/var/run/docker.sock</Text>, que equivale a dar root del host. Va <strong>en el sidecar, nunca en la aplicación</strong>: montarlo en un backend con tráfico público convierte cualquier fallo de esa app en control del servidor. El sidecar no acepta parámetros de entrada y su única ruta es <Text code>/ontoy</Text>.
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
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    Un <Text code>/ontoy</Text> que sólo lee un archivo de versión responde <Text code>200</Text> aunque la base de datos esté caída: eso produce falsos verdes en el panel. Verificar una migración con <Text code>curl -s http://&lt;host&gt;:8088/ontoy | jq</Text>; especificación completa en <Text code>huachicol/docs/ontoy-contrato.md</Text>.
                </Paragraph>
            </Card>
        </Space>
    );
}
