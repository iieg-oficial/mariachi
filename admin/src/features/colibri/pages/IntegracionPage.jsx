import { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Layout,
    Row,
    Select,
    Space,
    Spin,
    Tabs,
    Typography,
} from 'antd';
import { CopyOutlined, ExportOutlined } from '@ant-design/icons';
import { listSourceApps } from '@features/colibri/api/sourceAppsService';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const WIDGET_URL = '/colibri/widget/colibri-widget.v1.js';


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


export default function IntegracionPage() {
    const { isMobile } = useIsMobile();
    const [apps, setApps] = useState([]);
    const [appLoading, setAppLoading] = useState(true);
    const [selectedSlug, setSelectedSlug] = useState('');
    const [widgetReady, setWidgetReady] = useState(false);
    const [previewMode, setPreviewMode] = useState('button');

    useEffect(() => {
        listSourceApps()
            .then((data) => {
                const lista = Array.isArray(data) ? data : [];
                setApps(lista);
                const primero = lista.find((s) => s.activo && s.hasApiKey) || lista[0];
                if (primero) setSelectedSlug(primero.slug);
            })
            .catch(() => setApps([]))
            .finally(() => setAppLoading(false));
    }, []);

    useEffect(() => {
        if (document.querySelector(`script[data-colibri-widget]`)) {
            setWidgetReady(true);
            return;
        }
        const script = document.createElement('script');
        script.src = WIDGET_URL;
        script.defer = true;
        script.dataset.colibriWidget = 'true';
        script.onload = () => setWidgetReady(true);
        script.onerror = () => message.error('No se pudo cargar el bundle del widget');
        document.head.appendChild(script);
    }, []);

    const selectedApp = apps.find((a) => a.slug === selectedSlug);
    const apiKeyPlaceholder = 'TU_API_KEY';

    const snippetButton = `<script src="${WIDGET_URL}" defer></script>
<colibri-button
  source-app="${selectedSlug || 'mi-app'}"
  api-key="${apiKeyPlaceholder}"
  size="md"
  position="bottom-right"
  label="Reportar"
  icon="bug">
</colibri-button>`;

    const snippetTrigger = `<script src="${WIDGET_URL}" defer></script>
<p>
  Si encontraste un problema,
  <colibri-trigger
    source-app="${selectedSlug || 'mi-app'}"
    api-key="${apiKeyPlaceholder}"
    as="link"
    label="repórtalo aquí"
    icon="flag">
  </colibri-trigger>.
</p>`;

    const snippetForm = `<script src="${WIDGET_URL}" defer></script>
<colibri-form
  source-app="${selectedSlug || 'mi-app'}"
  api-key="${apiKeyPlaceholder}"
  layout="card"
  width="640px"
  tipo-selector="tabs">
</colibri-form>`;

    return (
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Integración del widget</Title>
                        <Text type="secondary">
                            Snippet copy-paste para integrar Colibri en cualquier sitio. Funciona en React, Vue, Astro, Wordpress y vanilla JS.
                        </Text>
                    </div>
                    <Button
                        icon={<ExportOutlined />}
                        href="/colibri/docs/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Docs públicas
                    </Button>
                </div>

                <Card>
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div>
                            <Text strong>1. Selecciona el source app</Text>
                            <div style={{ marginTop: 8 }}>
                                {appLoading ? <Spin size="small" /> : (
                                    <Select
                                        value={selectedSlug}
                                        onChange={setSelectedSlug}
                                        style={{ width: 320 }}
                                        options={apps.map((a) => ({
                                            value: a.slug,
                                            label: `${a.nombre} (${a.slug})${a.hasApiKey ? '' : ' — sin API key'}${!a.activo ? ' — inactivo' : ''}`,
                                        }))}
                                    />
                                )}
                            </div>
                        </div>

                        {selectedApp && (
                            <Alert
                                type={selectedApp.hasApiKey && selectedApp.activo ? 'success' : 'warning'}
                                showIcon
                                message={
                                    selectedApp.hasApiKey && selectedApp.activo
                                        ? `Listo: ${selectedApp.dominiosPermitidos?.length || 0} dominio(s) permitido(s), rate limit ${selectedApp.rateLimitPerHour}/h`
                                        : 'Este source app aún no está listo. Genera su API key y márcalo como activo en /colibri/source-apps antes de integrarlo en producción.'
                                }
                            />
                        )}

                        <div>
                            <Text strong>2. Reemplaza <Text code>TU_API_KEY</Text> por la key pública (`ck_pub_…`)</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Si no la tienes guardada, ve a <Text code>/colibri/source-apps</Text> y rota la key (la verás solo una vez).
                            </Text>
                        </div>

                        <div>
                            <Text strong>3. Pega el snippet en tu HTML</Text>
                        </div>
                    </Space>
                </Card>

                <Tabs
                    defaultActiveKey="button"
                    onChange={setPreviewMode}
                    items={[
                        {
                            key: 'button',
                            label: 'Botón flotante',
                            children: (
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={14}>
                                        <Card title="Snippet HTML" size="small">
                                            <CodeBlock code={snippetButton} />
                                        </Card>
                                    </Col>
                                    <Col xs={24} md={10}>
                                        <Card title="Vista previa" size="small">
                                            <div style={{ position: 'relative', minHeight: 300, border: '1px dashed #ccc', borderRadius: 8, padding: 16 }}>
                                                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                                                    El botón aparece flotante en la esquina indicada (en esta vista, lo verás en la esquina inferior derecha de toda la pantalla).
                                                </Paragraph>
                                                {widgetReady && selectedSlug && (
                                                    <colibri-button
                                                        source-app={selectedSlug}
                                                        api-key={selectedApp?.apiKeyPrefix || ''}
                                                        size="md"
                                                        position="bottom-right"
                                                        label="Reportar"
                                                        icon="bug"
                                                    />
                                                )}
                                            </div>
                                        </Card>
                                    </Col>
                                </Row>
                            ),
                        },
                        {
                            key: 'trigger',
                            label: 'Trigger inline',
                            children: (
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={14}>
                                        <Card title="Snippet HTML" size="small">
                                            <CodeBlock code={snippetTrigger} />
                                        </Card>
                                    </Col>
                                    <Col xs={24} md={10}>
                                        <Card title="Vista previa" size="small">
                                            <div style={{ minHeight: 100, padding: 12, background: '#fafafa', borderRadius: 6 }}>
                                                <p style={{ margin: 0, fontSize: 14, color: '#444' }}>
                                                    Si encontraste un problema,{' '}
                                                    {widgetReady && selectedSlug && (
                                                        <colibri-trigger
                                                            source-app={selectedSlug}
                                                            api-key={selectedApp?.apiKeyPrefix || ''}
                                                            as="link"
                                                            label="repórtalo aquí"
                                                            icon="flag"
                                                        />
                                                    )}.
                                                </p>
                                            </div>
                                        </Card>
                                    </Col>
                                </Row>
                            ),
                        },
                        {
                            key: 'form',
                            label: 'Formulario inline',
                            children: (
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={12}>
                                        <Card title="Snippet HTML" size="small">
                                            <CodeBlock code={snippetForm} />
                                        </Card>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Card title="Vista previa" size="small">
                                            {widgetReady && selectedSlug && (
                                                <colibri-form
                                                    source-app={selectedSlug}
                                                    api-key={selectedApp?.apiKeyPrefix || ''}
                                                    layout="card"
                                                    width="100%"
                                                    tipo-selector="tabs"
                                                />
                                            )}
                                        </Card>
                                    </Col>
                                </Row>
                            ),
                        },
                    ]}
                />

                <Card title="Notas importantes" size="small">
                    <Space direction="vertical" size={6}>
                        <Text style={{ fontSize: 13 }}>
                            <Text strong>•</Text> El widget se monta como Custom Element con Shadow DOM, no contamina el CSS del sitio huésped.
                        </Text>
                        <Text style={{ fontSize: 13 }}>
                            <Text strong>•</Text> En producción, configura los dominios permitidos en <Text code>/colibri/source-apps</Text> (acepta wildcards: <Text code>*.iieg.gob.mx</Text>).
                        </Text>
                        <Text style={{ fontSize: 13 }}>
                            <Text strong>•</Text> Para enriquecer reportes con datos del usuario logueado: <Text code>{`window.colibri.identify({ id, email, name, role })`}</Text> después de cargar el script.
                        </Text>
                        <Text style={{ fontSize: 13 }}>
                            <Text strong>•</Text> Eventos disponibles: <Text code>colibri:ready</Text>, <Text code>colibri:opened</Text>, <Text code>colibri:closed</Text>, <Text code>colibri:submitted</Text>, <Text code>colibri:error</Text>.
                        </Text>
                    </Space>
                </Card>
            </Space>
        </Content>
    );
}
