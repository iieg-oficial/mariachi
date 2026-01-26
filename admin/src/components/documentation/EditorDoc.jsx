import { Typography, Divider, Alert, Steps, Tag, Card, Space } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function EditorDoc() {
    return (
        <div>
            <Title level={2}>
                <FileTextOutlined /> Editor de Páginas
            </Title>
            <Tag color="blue">Esencial</Tag>
            <Tag color="green">Editor Visual</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="El editor de páginas es una herramienta visual que te permite crear y modificar el contenido de tus páginas mediante bloques arrastrables, sin necesidad de escribir código."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>¿Cómo usar el Editor?</Title>
            <Steps
                direction="vertical"
                current={-1}
                items={[
                    {
                        title: 'Selecciona una página',
                        description: 'Ve a "Todas las Páginas" y haz clic en "Editar" en la página que deseas modificar.'
                    },
                    {
                        title: 'Arrastra bloques al canvas',
                        description: 'En el panel izquierdo verás todos los bloques disponibles. Arrástralos al área de trabajo.'
                    },
                    {
                        title: 'Configura cada bloque',
                        description: 'Haz clic en un bloque para abrir el panel de propiedades y personalízalo.'
                    },
                    {
                        title: 'Vista previa y guardar',
                        description: 'Usa el botón de vista previa para ver cómo quedará. Guarda los cambios cuando estés listo.'
                    }
                ]}
            />

            <Divider />

            <Title level={4}>Componentes Básicos</Title>
            <Card size="small" style={{ marginBottom: 16 }} title="Elementos Básicos">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Text strong>Texto:</Text>
                        <Text> Párrafos y texto enriquecido para contenido general</Text>
                    </div>
                    <div>
                        <Text strong>Título:</Text>
                        <Text> Encabezados de diferentes niveles (H1, H2, H3, etc.)</Text>
                    </div>
                    <div>
                        <Text strong>Imagen:</Text>
                        <Text> Imágenes con opciones de alineación y tamaño</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Componentes de Secciones</Title>
            <Card size="small" style={{ marginBottom: 16 }} title="Secciones Completas">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="purple">Banner Hero</Tag>
                        <Text> Sección principal de bienvenida con título, subtítulo, botones CTA y estadísticas opcionales</Text>
                    </div>
                    <div>
                        <Tag color="blue">Carrusel</Tag>
                        <Text> Carrusel automático de slides con navegación, ideal para mostrar actualizaciones o noticias</Text>
                    </div>
                    <div>
                        <Tag color="green">Grid de Cards</Tag>
                        <Text> Grid responsive de tarjetas (1-4 columnas) con badges de color y opciones destacadas</Text>
                    </div>
                    <div>
                        <Tag color="orange">Sección Informativa</Tag>
                        <Text> Cards informativos con características y enlaces, perfecto para transparencia y recursos</Text>
                    </div>
                    <div>
                        <Tag color="red">Licitaciones</Tag>
                        <Text> Listado de licitaciones con estados, enlaces externos y guía de participación</Text>
                    </div>
                    <div>
                        <Tag color="cyan">Formulario de Contacto</Tag>
                        <Text> Formulario completo con información de contacto, mapa integrado y campos personalizables</Text>
                    </div>
                    <div>
                        <Tag color="gold">Destacado</Tag>
                        <Text> Showcase de características o sistemas con diseño de dos columnas, imágenes/videos y estadísticas</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Configuración de SEO</Title>
            <Paragraph>
                Cada página incluye campos específicos para optimización SEO:
            </Paragraph>
            <ul>
                <li>Meta título (recomendado: 50-60 caracteres)</li>
                <li>Meta descripción (recomendado: 150-160 caracteres)</li>
                <li>Palabras clave (separadas por comas)</li>
                <li>Imagen de compartir en redes sociales (Open Graph)</li>
                <li>Slug personalizado (URL amigable)</li>
            </ul>

            <Title level={4}>Atajos de Teclado</Title>
            <ul>
                <li><Text code>Ctrl + S</Text> - Guardar cambios</li>
                <li><Text code>Ctrl + Z</Text> - Deshacer</li>
                <li><Text code>Ctrl + Y</Text> - Rehacer</li>
                <li><Text code>Delete</Text> - Eliminar bloque seleccionado</li>
                <li><Text code>Ctrl + D</Text> - Duplicar bloque seleccionado</li>
            </ul>

            <Alert
                message="Guardado Automático"
                description="El editor guarda automáticamente tus cambios cada 30 segundos. También puedes guardar manualmente con Ctrl + S."
                type="success"
                showIcon
            />
        </div>
    );
}
