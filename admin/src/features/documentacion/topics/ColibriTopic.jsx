import { Card, Space, Table, Tabs, Tag, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';

const { Title, Text } = Typography;

const WIDGET_SRC = '/colibri/widget/colibri-widget.v1.js';

const MODOS = [
    { que: '<colibri-button>', como: 'Botón flotante (FAB) que abre el panel. Para agregar reporte sin tocar el layout.' },
    { que: '<colibri-trigger>', como: 'Link / ícono / chip inline. Footers, menús o junto a un dato ("reportar dato incorrecto").' },
    { que: '<colibri-form>', como: 'Formulario embebido inline, sin trigger. Landings dedicadas a feedback.' },
];

const ATRIBUTOS = [
    { campo: 'source-app', desc: 'Requerido. Slug del huésped registrado en /colibri/source-apps.' },
    { campo: 'api-key', desc: 'Requerido. Key pública ck_pub_*.' },
    { campo: 'tipos', desc: 'CSV. Subset de tipos permitidos (default: todos los activos).' },
    { campo: 'theme', desc: 'light · dark · auto (default auto).' },
    { campo: 'endpoint', desc: 'Se deriva del origen del <script> automáticamente; solo override para dev/staging.' },
];

const JS_API = [
    { campo: 'identify(user)', desc: 'Asocia el usuario logueado ({ id, email, name, role }) a los reportes siguientes.' },
    { campo: 'setContext(k, v)', desc: 'Adjunta datos de negocio a source_context.custom (ej. envioId, sourceRoute).' },
    { campo: 'clearContext()', desc: 'Limpia el contexto acumulado.' },
    { campo: 'openPanel(opts)', desc: 'Abre el panel desde un botón propio. opts: { sourceApp, apiKey, tipoDefault, tipos }.' },
];

const API_KEY = [
    { campo: 'ck_pub_*', desc: 'Browser. Valida CORS contra dominios_permitidos. Visible en el HTML del huésped.' },
    { campo: 'ck_priv_*', desc: 'Server-side (SDK). En variable de entorno; no valida CORS.' },
];

const CAMPO_COLUMNS = [
    { title: 'Campo', dataIndex: 'campo', key: 'campo', width: 200, render: (v) => <Text code>{v}</Text> },
    { title: 'Descripción', dataIndex: 'desc', key: 'desc' },
];

const MODO_COLUMNS = [
    { title: 'Elemento', dataIndex: 'que', key: 'que', width: 200, render: (v) => <Text code>{v}</Text> },
    { title: 'Cuándo usarlo', dataIndex: 'como', key: 'como' },
];

const SNIPPET_WIDGET = `<script src="${WIDGET_SRC}" defer></script>
<colibri-button
  source-app="mi-app"
  api-key="ck_pub_TU_KEY"
  label="Reportar">
</colibri-button>`;

const SNIPPET_REACT = `// Monta el botón una sola vez en el layout autenticado.
const abrirReporte = () => {
  window.colibri.clearContext();
  window.colibri.identify({ id: user.id, email: user.email, name: user.nombre, role: user.role });
  window.colibri.setContext('sourceRoute', location.pathname);
  window.colibri.openPanel({ sourceApp: 'mi-app', apiKey: API_KEY });
};

// FAB con estilo IIEG. El style inline evita que el reset CSS global deforme el botón.
<button type="button" onClick={abrirReporte} style={{ padding: 0, border: 0 }}
  className="fixed bottom-4 right-4 z-50 w-7 h-7 rounded-full bg-white ...">
  {/* ícono */}
</button>`;

const SNIPPET_SDK = `import { Colibri } from '@iieg/colibri-sdk';

const colibri = new Colibri({
  sourceApp: 'mi-cron',
  apiKey: process.env.COLIBRI_API_KEY,      // ck_priv_*
  baseUrl: 'https://iieg.jalisco.gob.mx/api/public',  // absoluto en Node
});

await colibri.report({ tipo: 'bug', mensaje: 'ETL falló', context: { jobId } });`;

const SNIPPET_SIEEJ = `// FormList.jsx — "solicitar reapertura" desde un envío ya enviado
const handleContactAdmin = (f) => {
  window.colibri.clearContext();
  window.colibri.identify({ id: user.id, email: user.email, name: user.nombre, role: user.role });
  window.colibri.setContext('envioId', f.envio_id);
  window.colibri.setContext('formulario', f.nombre);
  window.colibri.openPanel({
    sourceApp: 'sieej', apiKey: API_KEY,
    tipoDefault: 'solicitud', tipos: 'solicitud',   // panel acotado a un tipo
  });
};`;

const SIEEJ_CONFIG = [
    { campo: 'VITE_COLIBRI_SOURCE_APP', desc: 'sieej' },
    { campo: 'VITE_COLIBRI_API_KEY', desc: 'ck_pub_* generada en /colibri/source-apps para el source app sieej.' },
    { campo: 'script', desc: 'colibri-widget.v1.js en index.html. En dev, proxea /colibri y /api/public al host de mariachi.' },
    { campo: 'montaje', desc: '<ColibriReportButton /> una vez en MainLayout (botón global — patrón React).' },
];


function CodeBlock({ code }) {
    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(
            () => message.success('Copiado'),
            () => message.error('No se pudo copiar'),
        );
    };
    return (
        <div style={{ position: 'relative' }}>
            <pre
                style={{
                    background: '#0d1117',
                    color: '#e6edf3',
                    padding: 16,
                    borderRadius: 8,
                    fontSize: 12,
                    overflow: 'auto',
                    margin: 0,
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                }}
            >
                {code}
            </pre>
            <button
                onClick={handleCopy}
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(255,255,255,0.1)',
                    color: '#e6edf3',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                }}
            >
                <CopyOutlined /> Copiar
            </button>
        </div>
    );
}

function Tabla({ titulo, data, columns = CAMPO_COLUMNS, rowKey = 'campo' }) {
    return (
        <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{titulo}</Text>
            <Table rowKey={rowKey} size="small" pagination={false} dataSource={data} columns={columns} />
        </div>
    );
}


const widgetTab = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Tabla titulo="3 modos de integración" data={MODOS} columns={MODO_COLUMNS} rowKey="que" />
        <Card size="small" title="Snippet mínimo">
            <CodeBlock code={SNIPPET_WIDGET} />
        </Card>
        <Tabla titulo="Atributos compartidos" data={ATRIBUTOS} />
        <Tabla titulo="Tipos de API key" data={API_KEY} />
        <Text type="secondary" style={{ fontSize: 12 }}>
            El widget usa Shadow DOM: no contamina el CSS ni el JS del sitio huésped.
        </Text>
    </Space>
);

const reactTab = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
            Para huéspedes React del ecosistema (mapalab, sieej). Un componente que dispara el panel con{' '}
            <Text code>openPanel</Text>, tras identificar al usuario logueado y adjuntar la ruta actual.
        </Text>
        <Card size="small" title="ColibriReportButton (patrón)">
            <CodeBlock code={SNIPPET_REACT} />
        </Card>
        <Tabla titulo="API global window.colibri" data={JS_API} />
        <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Notas</Text>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                <li><Text code>{'style={{ padding: 0, border: 0 }}'}</Text> es obligatorio: algunos huéspedes (sieej) tienen un reset CSS global <Text code>button {'{ ... }'}</Text> que gana specificity sobre Tailwind y deforma el FAB.</li>
                <li>Implementaciones de referencia: <Text code>mapalab/frontend/src/components/ReportButton.jsx</Text> y <Text code>sieej/frontend/src/components/ColibriReportButton.jsx</Text>.</li>
                <li>En dev, proxea <Text code>/colibri</Text> y <Text code>/api/public</Text> al host de mariachi en <Text code>vite.config.js</Text>.</li>
            </ul>
        </div>
    </Space>
);

const sdkTab = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
            Para reportar sin UI desde un cron, worker o proceso server-side. Paquete npm{' '}
            <Text code>@iieg/colibri-sdk</Text>.
        </Text>
        <Card size="small" title="Uso">
            <CodeBlock code={SNIPPET_SDK} />
        </Card>
        <Text type="secondary" style={{ fontSize: 12 }}>
            En Node el <Text code>baseUrl</Text> debe ser absoluto (en el browser puede ser relativo). Errores tipados:{' '}
            <Text code>AuthError</Text>, <Text code>ValidationError</Text>, <Text code>RateLimitError</Text>,{' '}
            <Text code>ForbiddenError</Text>, <Text code>NetworkError</Text>.
        </Text>
    </Space>
);

const sieejTab = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
            Ejemplo real. SIEEJ usa el botón global (ver <Text strong>Patrón React</Text>) y, además, una{' '}
            <strong>solicitud de reapertura</strong> desde cada formulario enviado: abre el panel acotado al tipo{' '}
            <Text code>solicitud</Text> con el <Text code>envioId</Text> y el nombre del formulario en el contexto.
        </Text>
        <Card size="small" title="Reapertura de envío">
            <CodeBlock code={SNIPPET_SIEEJ} />
        </Card>
        <Tabla titulo="Configuración en SIEEJ" data={SIEEJ_CONFIG} />
    </Space>
);


export default function ColibriTopic({ showHeader = true }) {
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {showHeader && (
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>
                        Colibri <Tag color="purple">reportes embebibles</Tag>
                    </Title>
                    <Text type="secondary">
                        Centraliza reportes (bugs, sugerencias, solicitudes) de cualquier sitio del ecosistema. Panel en{' '}
                        <Text code>/colibri</Text>; API key por huésped en <Text code>/colibri/source-apps</Text>.
                    </Text>
                </div>
            )}

            <Tabs
                defaultActiveKey="widget"
                items={[
                    { key: 'widget', label: 'Widget', children: widgetTab },
                    { key: 'react', label: 'Patrón React', children: reactTab },
                    { key: 'sdk', label: 'SDK (server-side)', children: sdkTab },
                    { key: 'sieej', label: 'SIEEJ', children: sieejTab },
                ]}
            />
        </Space>
    );
}
