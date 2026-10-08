import { useState } from 'react';
import { Button, Card, Space, Table, Tabs, Tag, Typography } from 'antd';
import { CopyOutlined, ExperimentOutlined } from '@ant-design/icons';
import ThumbnailDiagnostics from '@features/acervo/components/ThumbnailDiagnostics';
import { toPublicUrl } from '@features/acervo/api/acervoService';
import { message } from '@shared/services/message';

const { Title, Paragraph, Text } = Typography;

const UPLOAD_PATH = '/api/internal/acervo/upload';

const HOW_COLUMNS = [
    { title: 'Herramienta', dataIndex: 'que', key: 'que', width: 220, render: (v) => <Text strong>{v}</Text> },
    { title: 'Cómo se usa', dataIndex: 'como', key: 'como' },
];

const CAMPO_COLUMNS = [
    { title: 'Campo', dataIndex: 'campo', key: 'campo', width: 160, render: (v) => <Text code>{v}</Text> },
    { title: 'Descripción', dataIndex: 'desc', key: 'desc' },
];

const NAV = [
    { que: 'Elegir bucket', como: 'Pestañas superiores (uno por proyecto). El último usado se recuerda. Hay buckets públicos (iieg, mapalab, portal) y privados (mariachi, sieej).' },
    { que: 'Entrar a carpeta', como: 'Clic en la tarjeta/fila de la carpeta. La ruta actual se muestra en el breadcrumb; clic en un tramo para volver.' },
    { que: 'Buscar', como: 'Caja "Buscar archivos": filtra por nombre en todo el bucket (recursivo).' },
    { que: 'Filtrar por tipo', como: 'Selector Tipo (Imágenes / Documentos / Videos / Audio).' },
    { que: 'Vista', como: 'Conmutador Grid / Lista.' },
    { que: 'Documentación', como: 'Botón 📖 en el encabezado: abre esta guía en un modal. Los snippets de cada imagen enlazan directo a la pestaña "Miniaturas y URLs".' },
];

const UPLOAD = [
    { que: 'Subir', como: 'Botón "Subir Archivos" (elige carpeta destino y texto alternativo) o arrastra archivos sobre la zona del listado.' },
    { que: 'Nombre del archivo', como: 'Por defecto conserva el nombre original (URL legible). Marca "Usar identificador único (UUID)" para un nombre aleatorio (evita caché obsoleta al reemplazar / no expone el nombre).' },
    { que: 'Archivos grandes', como: 'Subida directa hasta 500 MB; arriba de eso se sube por partes automáticamente.' },
    { que: 'Conflicto de nombre', como: 'En carga masiva no se detiene: al terminar, un diálogo lista los repetidos para Renombrar (agrega -2, -3…) u Omitir, por archivo o en bloque.' },
];

const ACTIONS = [
    { que: 'Previsualizar', como: 'Clic en la imagen o el botón con ícono de ojo. Muestra una versión escalada; "Ver original" abre el archivo completo.' },
    { que: 'Código (snippets)', como: 'Solo imágenes. En vista Lista: botón </> que expande la fila y muestra los snippets colapsables sobre el item; en Grid: botón </> que abre un modal. Snippets listos para pegar (<img> directo, miniatura, srcSet y <Image> de Ant Design) con la URL real del archivo.' },
    { que: 'Copiar URL', como: 'Botón copiar: copia la URL pública con el dominio incluido.' },
    { que: 'Editar', como: 'Botón editar: cambia texto alternativo, descripción y carpeta.' },
    { que: 'Mover', como: 'Botón mover (en grid): selecciona la carpeta destino.' },
    { que: 'Eliminar', como: 'Botón de bote de basura (pide confirmación).' },
    { que: 'Eliminar varios', como: 'En vista Lista, marca las casillas y usa "Eliminar Seleccionados".' },
];

const FOLDERS = [
    { que: 'Crear carpeta', como: 'Botón "Nueva Carpeta" (opcionalmente dentro de una carpeta padre).' },
    { que: 'Información', como: 'Botón de info: archivos, imágenes, subcarpetas, peso total y última modificación.' },
    { que: 'Descargar ZIP', como: 'Botón de descarga en la carpeta: empaqueta su contenido (hasta 500 MB).' },
    { que: 'Eliminar carpeta', como: 'Debe estar vacía; mueve o elimina sus archivos primero.' },
];

const SUBIDA_CAMPOS = [
    { campo: 'file', desc: 'Archivo. Obligatorio. Máx 25 MB.' },
    { campo: 'bucket_name', desc: 'Obligatorio. Debe ser portal.' },
    { campo: 'folder', desc: 'Carpeta destino (opcional).' },
    { campo: 'on_conflict', desc: 'rename (default, agrega sufijo) o reject (409 si ya existe).' },
    { campo: 'use_uuid', desc: 'true para nombre de objeto aleatorio (opcional).' },
    { campo: 'alt', desc: 'Texto alternativo (opcional).' },
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

function TablaSeccion({ titulo, data, columns = HOW_COLUMNS, rowKey = 'que' }) {
    return (
        <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{titulo}</Text>
            <Table rowKey={rowKey} size="small" pagination={false} dataSource={data} columns={columns} />
        </div>
    );
}

export default function AcervoTopic({ defaultActiveTab = 'uso', showHeader = true }) {
    const [showDiag, setShowDiag] = useState(false);

    const gatewayUrl = `${window.location.origin}${UPLOAD_PATH}`;
    const exampleUrl = toPublicUrl('/acervo/portal/branding/logo.png');

    const snippetCurl = `curl -X POST "${gatewayUrl}" \\
  -H "X-Internal-Token: $ACERVO_INTERNAL_TOKEN" \\
  -F "file=@logo.png" \\
  -F "bucket_name=portal" \\
  -F "folder=branding"`;

    const snippetFetch = `const fd = new FormData();
fd.append('file', archivo);            // File / Blob
fd.append('bucket_name', 'portal');    // unico bucket permitido
fd.append('folder', 'branding');       // opcional

const res = await fetch('${UPLOAD_PATH}', {
    method: 'POST',
    headers: { 'X-Internal-Token': ACERVO_INTERNAL_TOKEN },
    body: fd,
});
const data = await res.json();`;

    const snippetResponse = `{
  "name": "branding/logo.png",
  "originalName": "logo.png",
  "url": "${exampleUrl}",
  "thumbnailUrl": "/acervo/thumb/portal/branding/logo.png?w=320",
  "bucket": "portal",
  "bucketId": 1,
  "folder": "branding/",
  "size": 12345,
  "type": "image/png"
}`;

    const usoTab = (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <TablaSeccion titulo="Navegación y búsqueda" data={NAV} />
            <TablaSeccion titulo="Subir archivos" data={UPLOAD} />
            <TablaSeccion titulo="Acciones sobre un archivo" data={ACTIONS} />
            <TablaSeccion titulo="Carpetas" data={FOLDERS} />
        </Space>
    );

    const miniaturasTab = (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 8, fontSize: 12 }}>
                    Las miniaturas (PNG/JPG/WebP/GIF) se generan al vuelo en formato WebP y se cachean; el SVG se muestra tal cual. La galería ya no descarga el archivo completo para mostrar la tarjeta.
                </Paragraph>
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 8, fontSize: 12 }}>
                    <Tag color="blue">Público</Tag> Las miniaturas de buckets públicos (<Text code>iieg</Text>, <Text code>mapalab</Text>, <Text code>portal</Text>) se sirven por la ruta <strong>anónima</strong> <Text code>/acervo/thumb/&lt;bucket&gt;/&lt;ruta&gt;?w=</Text>: cualquier sitio del ecosistema puede incrustarlas sin sesión. La URL directa del original es <Text code>/acervo/&lt;bucket&gt;/&lt;ruta&gt;</Text>.
                </Paragraph>
                <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                    <Tag>Privado</Tag> Los buckets privados (<Text code>mariachi</Text>, <Text code>sieej</Text>) <strong>no</strong> generan miniatura pública (<Text code>thumbnail: null</Text>): sus archivos solo son alcanzables por staff a través del proxy autenticado <Text code>/api/administrador/acervo/proxy/&lt;bucket_id&gt;/&lt;ruta&gt;</Text>. La URL que copias siempre incluye el dominio.
                </Paragraph>
            </div>

            <Card title="¿Cómo incrusto una imagen en mi frontend?" size="small">
                <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                    En la página del Acervo, cada imagen tiene un botón <Text code>&lt;/&gt;</Text> (ícono de código): en vista <strong>Lista</strong> expande la fila y muestra los <strong>snippets colapsables</strong> sobre el propio item; en <strong>Grid</strong> abre un modal. Los mismos snippets están también aquí, en cada imagen del <strong>Diagnóstico de miniaturas</strong> (panel "Snippets de código"). Se generan con la ruta real del archivo: <Text code>&lt;img&gt;</Text> directo, miniatura WebP, <Text code>srcSet</Text> responsivo (120/400/1280), <strong>componente React (JSX)</strong> y el componente <Text code>&lt;Image&gt;</Text> de Ant Design con preview. Cada bloque se copia con un clic. Para buckets privados solo se ofrece la URL del proxy autenticado (sin miniatura).
                </Paragraph>
            </Card>

            <Card
                title={<><ExperimentOutlined /> Diagnóstico de miniaturas (en vivo)</>}
                size="small"
                extra={!showDiag && (
                    <Button type="primary" size="small" onClick={() => setShowDiag(true)}>
                        Ejecutar
                    </Button>
                )}
            >
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: showDiag ? 12 : 0, fontSize: 12 }}>
                    Compara, por cada imagen <strong>raster</strong> del bucket, el original contra las variantes <Text code>w=120</Text>, <Text code>w=400</Text> y <Text code>w=1280</Text>: muestra el peso de cada una, su % respecto al original y la URL para pedirla. Deben llegar como <Text code>image/webp</Text>. Los SVG se omiten (son vectoriales, no se comprimen).
                </Paragraph>
                {showDiag && <ThumbnailDiagnostics />}
            </Card>
        </Space>
    );

    const subidaExternaTab = (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                Endpoint interno <Text code>POST {UPLOAD_PATH}</Text> para que una plataforma externa (el <strong>Portal</strong>) suba archivos al bucket <Text code>portal</Text> sin sesión de Mariachi. <strong>Solo sube</strong>: el borrado, la edición y la vista se hacen desde el Acervo de Mariachi. Se autentica con el header <Text code>X-Internal-Token</Text> (valor de <Text code>ACERVO_INTERNAL_TOKEN</Text> en mariachi-api); no usa lista de IPs.
            </Paragraph>

            <TablaSeccion titulo="Campos (multipart/form-data)" data={SUBIDA_CAMPOS} columns={CAMPO_COLUMNS} rowKey="campo" />

            <Card size="small" title="Ejemplo (curl)">
                <CodeBlock code={snippetCurl} />
            </Card>

            <Card size="small" title="Ejemplo (JavaScript / fetch)">
                <CodeBlock code={snippetFetch} />
            </Card>

            <Card size="small" title="Respuesta (201)">
                <CodeBlock code={snippetResponse} />
            </Card>

            <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Notas</Text>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    <li>Cómo llegar: en la misma red (iieg-network), <Text code>http://mariachi-api:8000{UPLOAD_PATH}</Text>; desde otro servidor, por el gateway <Text code>{gatewayUrl}</Text>.</li>
                    <li>Único bucket permitido: <Text code>portal</Text>. Para <Text code>iieg</Text> u otro, sube desde Mariachi.</li>
                    <li>Máx 25 MB. Tipos: imágenes (PNG/JPG/GIF/WebP/SVG), PDF, documentos de oficina, texto/CSV/JSON y ZIP.</li>
                    <li>Nombres saneados; si el archivo ya existe se renombra (<Text code>logo-2.png</Text>) salvo <Text code>on_conflict=reject</Text>.</li>
                    <li>El token se rota editando <Text code>ACERVO_INTERNAL_TOKEN</Text> en el <Text code>.env</Text> de mariachi-api y reiniciando el servicio.</li>
                </ul>
            </div>
        </Space>
    );

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {showHeader && (
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Acervo</Title>
                    <Text type="secondary">
                        Gestor de archivos del ecosistema (imágenes, documentos, íconos) sobre SeaweedFS. Guía rápida de las herramientas de la página <Text code>/mariachi/acervo</Text>.
                    </Text>
                </div>
            )}

            <Tabs
                defaultActiveKey={defaultActiveTab}
                items={[
                    { key: 'uso', label: 'Uso del panel', children: usoTab },
                    { key: 'thumbs', label: 'Miniaturas y URLs', children: miniaturasTab },
                    { key: 'subida-externa', label: 'Subida externa', children: subidaExternaTab },
                ]}
            />
        </Space>
    );
}
