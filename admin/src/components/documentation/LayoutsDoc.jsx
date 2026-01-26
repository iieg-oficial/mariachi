import { Typography, Divider, Alert, Tag, Card, Space } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function LayoutsDoc() {
    return (
        <div>
            <Title level={2}>
                <BgColorsOutlined /> Layouts y Estilos
            </Title>
            <Tag color="purple">Avanzado</Tag>
            <Tag color="blue">Diseño</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="Los layouts y estilos te permiten definir la apariencia visual de tu sitio: colores, tipografías, espaciados y diseños de página."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>Tipos de Layouts</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="blue">Ancho Completo</Tag>
                        <Text> El contenido ocupa todo el ancho de la pantalla</Text>
                    </div>
                    <div>
                        <Tag color="green">Contenedor</Tag>
                        <Text> El contenido está centrado con un ancho máximo</Text>
                    </div>
                    <div>
                        <Tag color="orange">Sidebar Izquierda</Tag>
                        <Text> Barra lateral a la izquierda, contenido a la derecha</Text>
                    </div>
                    <div>
                        <Tag color="purple">Sidebar Derecha</Tag>
                        <Text> Contenido a la izquierda, barra lateral a la derecha</Text>
                    </div>
                    <div>
                        <Tag color="red">Dos Sidebars</Tag>
                        <Text> Contenido en el centro, barras laterales a ambos lados</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Configuración de Colores</Title>
            <Paragraph>
                Personaliza la paleta de colores de tu sitio:
            </Paragraph>
            <ul>
                <li><Text strong>Color Primario:</Text> Color principal de la marca</li>
                <li><Text strong>Color Secundario:</Text> Color complementario</li>
                <li><Text strong>Color de Fondo:</Text> Fondo general del sitio</li>
                <li><Text strong>Color de Texto:</Text> Color principal del texto</li>
                <li><Text strong>Color de Enlaces:</Text> Color de los hipervínculos</li>
                <li><Text strong>Color de Acento:</Text> Para botones y elementos destacados</li>
            </ul>

            <Title level={4}>Tipografía</Title>
            <Paragraph>
                Configura las fuentes de tu sitio:
            </Paragraph>
            <ul>
                <li><Text strong>Fuente de Títulos:</Text> Para headings (H1, H2, H3...)</li>
                <li><Text strong>Fuente del Cuerpo:</Text> Para párrafos y texto general</li>
                <li><Text strong>Tamaño Base:</Text> Tamaño de fuente por defecto</li>
                <li><Text strong>Peso de Fuente:</Text> Normal, negrita, etc.</li>
                <li><Text strong>Altura de Línea:</Text> Espaciado entre líneas</li>
                <li><Text strong>Fuentes de Google:</Text> Integración con Google Fonts</li>
            </ul>

            <Title level={4}>Espaciado y Márgenes</Title>
            <Paragraph>
                Control del espaciado en tu sitio:
            </Paragraph>
            <ul>
                <li>Padding de contenedor (interno)</li>
                <li>Margen de secciones</li>
                <li>Espaciado entre elementos</li>
                <li>Ancho máximo de contenedor</li>
                <li>Bordes redondeados</li>
            </ul>

            <Title level={4}>Header y Footer</Title>
            <Paragraph>
                Personaliza el encabezado y pie de página:
            </Paragraph>
            <ul>
                <li><Text strong>Header:</Text> Altura, posición fija, transparencia, logo, menú</li>
                <li><Text strong>Footer:</Text> Número de columnas, color de fondo, widgets</li>
                <li><Text strong>Logo:</Text> Tamaño, posición, versión móvil</li>
            </ul>

            <Title level={4}>Responsive Design</Title>
            <Paragraph>
                Configuración para diferentes dispositivos:
            </Paragraph>
            <ul>
                <li><Text strong>Desktop:</Text> Pantallas mayores a 1200px</li>
                <li><Text strong>Tablet:</Text> Pantallas entre 768px y 1199px</li>
                <li><Text strong>Mobile:</Text> Pantallas menores a 767px</li>
                <li>Ocultar elementos en ciertos dispositivos</li>
                <li>Tamaños de fuente adaptativos</li>
            </ul>

            <Title level={4}>CSS Personalizado</Title>
            <Paragraph>
                Para usuarios avanzados:
            </Paragraph>
            <ul>
                <li>Añadir CSS personalizado globalmente</li>
                <li>CSS específico para ciertas páginas</li>
                <li>Importar hojas de estilo externas</li>
                <li>Usar variables CSS para mayor flexibilidad</li>
            </ul>

            <Alert
                message="Modo Oscuro"
                description="El sistema soporta modo oscuro automático. Configura los colores para ambos temas en la sección de personalización."
                type="success"
                showIcon
            />
        </div>
    );
}
