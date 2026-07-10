import { useState } from 'react';
import { Button, Card, Space, Table, Tabs, Tag, Typography } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import ThumbnailDiagnostics from '@features/acervo/components/ThumbnailDiagnostics';

const { Title, Paragraph, Text } = Typography;

const HOW_COLUMNS = [
    { title: 'Herramienta', dataIndex: 'que', key: 'que', width: 220, render: (v) => <Text strong>{v}</Text> },
    { title: 'Cómo se usa', dataIndex: 'como', key: 'como' },
];

const NAV = [
    { que: 'Elegir bucket', como: 'Pestañas superiores (uno por proyecto). El último usado se recuerda. Hay buckets públicos (iieg, mapalab, portal) y privados (mariachi, sieej).' },
    { que: 'Entrar a carpeta', como: 'Clic en la tarjeta/fila de la carpeta. La ruta actual se muestra en el breadcrumb; clic en un tramo para volver.' },
    { que: 'Buscar', como: 'Caja "Buscar archivos": filtra por nombre en todo el bucket (recursivo).' },
    { que: 'Filtrar por tipo', como: 'Selector Tipo (Imágenes / Documentos / Videos / Audio).' },
    { que: 'Vista', como: 'Conmutador Grid / Lista.' },
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

function TablaSeccion({ titulo, data }) {
    return (
        <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{titulo}</Text>
            <Table rowKey="que" size="small" pagination={false} dataSource={data} columns={HOW_COLUMNS} />
        </div>
    );
}

export default function AcervoTopic() {
    const [showDiag, setShowDiag] = useState(false);

    const usoTab = (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <TablaSeccion titulo="Navegación y búsqueda" data={NAV} />
            <TablaSeccion titulo="Subir archivos" data={UPLOAD} />
            <TablaSeccion titulo="Acciones sobre un archivo" data={ACTIONS} />
            <TablaSeccion titulo="Carpetas" data={FOLDERS} />
        </Space>
    );

    const miniaturasTab = (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
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

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Acervo</Title>
                <Text type="secondary">
                    Gestor de archivos del ecosistema (imágenes, documentos, íconos) sobre SeaweedFS. Guía rápida de las herramientas de la página <Text code>/mariachi/acervo</Text>.
                </Text>
            </div>

            <Tabs
                defaultActiveKey="uso"
                items={[
                    { key: 'uso', label: 'Uso del panel', children: usoTab },
                    { key: 'thumbs', label: 'Miniaturas y URLs', children: miniaturasTab },
                ]}
            />
        </Space>
    );
}
