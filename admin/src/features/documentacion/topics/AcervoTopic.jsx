import { useState } from 'react';
import { Button, Card, Space, Table, Tag, Typography } from 'antd';
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


export default function AcervoTopic() {
    const [showDiag, setShowDiag] = useState(false);

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Acervo</Title>
                <Text type="secondary">
                    Gestor de archivos del ecosistema (imágenes, documentos, íconos) sobre SeaweedFS. Guía rápida de las herramientas de la página <Text code>/mariachi/acervo</Text>.
                </Text>
            </div>

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

            <Card title="Navegación y búsqueda" size="small">
                <Table rowKey="que" size="small" pagination={false} dataSource={NAV} columns={HOW_COLUMNS} />
            </Card>

            <Card title="Subir archivos" size="small">
                <Table rowKey="que" size="small" pagination={false} dataSource={UPLOAD} columns={HOW_COLUMNS} />
            </Card>

            <Card title="Acciones sobre un archivo" size="small">
                <Table rowKey="que" size="small" pagination={false} dataSource={ACTIONS} columns={HOW_COLUMNS} />
            </Card>

            <Card title="Carpetas" size="small">
                <Table rowKey="que" size="small" pagination={false} dataSource={FOLDERS} columns={HOW_COLUMNS} />
            </Card>

            <Card title="Miniaturas y URLs" size="small">
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 8, fontSize: 12 }}>
                    Las miniaturas (PNG/JPG) se generan al vuelo en formato WebP y se cachean; el SVG se muestra tal cual. La galería ya no descarga el archivo completo para mostrar la tarjeta.
                </Paragraph>
                <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                    <Tag color="blue">Público</Tag> sirve la URL directa del archivo. <Tag>Privado</Tag> se sirve por un proxy autenticado (solo staff con acceso al proyecto). La URL que copias siempre incluye el dominio.
                </Paragraph>
            </Card>
        </Space>
    );
}
