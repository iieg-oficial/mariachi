import { Typography, Divider, Alert, Steps, Tag, Card, Space } from 'antd';
import { PictureOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function MediaDoc() {
    return (
        <div>
            <Title level={2}>
                <PictureOutlined /> Biblioteca Multimedia
            </Title>
            <Tag color="blue">Esencial</Tag>
            <Tag color="green">Archivos</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="La biblioteca multimedia es el repositorio central para todos los archivos de tu sitio: imágenes, videos, documentos PDF, archivos de audio y más."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>¿Cómo subir archivos?</Title>
            <Steps
                direction="vertical"
                current={-1}
                items={[
                    {
                        title: 'Haz clic en "Subir Archivos"',
                        description: 'O arrastra archivos directamente desde tu explorador de archivos.'
                    },
                    {
                        title: 'Selecciona los archivos',
                        description: 'Puedes subir múltiples archivos a la vez. Máximo 10MB por archivo.'
                    },
                    {
                        title: 'Espera la confirmación',
                        description: 'Los archivos se procesarán y aparecerán en tu biblioteca.'
                    },
                    {
                        title: 'Completa la información',
                        description: 'Añade título, texto alternativo y descripción a tus archivos.'
                    }
                ]}
            />

            <Divider />

            <Title level={4}>Tipos de Archivos Soportados</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="blue">Imágenes</Tag>
                        <Text> JPG, PNG, GIF, WebP, SVG (máx 10MB)</Text>
                    </div>
                    <div>
                        <Tag color="green">Videos</Tag>
                        <Text> MP4, WebM, MOV (máx 50MB)</Text>
                    </div>
                    <div>
                        <Tag color="orange">Audio</Tag>
                        <Text> MP3, WAV, OGG (máx 10MB)</Text>
                    </div>
                    <div>
                        <Tag color="purple">Documentos</Tag>
                        <Text> PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (máx 10MB)</Text>
                    </div>
                    <div>
                        <Tag color="red">Otros</Tag>
                        <Text> ZIP, CSV, TXT (máx 10MB)</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Organización de Archivos</Title>
            <Paragraph>
                Mantén tu biblioteca organizada usando estas funcionalidades:
            </Paragraph>
            <ul>
                <li><Text strong>Carpetas:</Text> Crea carpetas para categorizar tus archivos</li>
                <li><Text strong>Etiquetas:</Text> Añade etiquetas para búsqueda rápida</li>
                <li><Text strong>Filtros:</Text> Filtra por tipo, fecha o tamaño de archivo</li>
                <li><Text strong>Búsqueda:</Text> Busca por nombre, descripción o etiquetas</li>
                <li><Text strong>Vista:</Text> Alterna entre vista de grilla y lista</li>
            </ul>

            <Title level={4}>Edición de Imágenes</Title>
            <Paragraph>
                El sistema incluye un editor básico de imágenes:
            </Paragraph>
            <ul>
                <li>Recortar y redimensionar</li>
                <li>Rotar y voltear</li>
                <li>Ajustar brillo, contraste y saturación</li>
                <li>Aplicar filtros predefinidos</li>
                <li>Comprimir para optimizar el tamaño</li>
            </ul>

            <Title level={4}>Información de Archivo</Title>
            <Paragraph>
                Para cada archivo puedes configurar:
            </Paragraph>
            <ul>
                <li><Text strong>Título:</Text> Nombre descriptivo del archivo</li>
                <li><Text strong>Texto Alternativo (Alt):</Text> Importante para SEO y accesibilidad</li>
                <li><Text strong>Descripción:</Text> Información adicional sobre el archivo</li>
                <li><Text strong>Leyenda:</Text> Texto que aparece debajo de la imagen</li>
                <li><Text strong>URL:</Text> Enlace directo al archivo</li>
            </ul>

            <Title level={4}>Optimización Automática</Title>
            <Paragraph>
                El sistema optimiza automáticamente las imágenes:
            </Paragraph>
            <ul>
                <li>Genera múltiples tamaños (thumbnail, medium, large)</li>
                <li>Convierte a formatos modernos (WebP) cuando sea posible</li>
                <li>Comprime sin pérdida visible de calidad</li>
                <li>Carga lazy para mejorar el rendimiento</li>
            </ul>

            <Alert
                message="Consejo SEO"
                description="Siempre completa el campo de texto alternativo (Alt) en las imágenes. Esto mejora el SEO y la accesibilidad de tu sitio."
                type="success"
                showIcon
            />
        </div>
    );
}
