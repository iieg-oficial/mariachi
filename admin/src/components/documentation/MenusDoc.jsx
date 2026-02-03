import { Typography, Divider, Alert, Steps, Tag, Card, Space } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function MenusDoc() {
    return (
        <div>
            <Title level={2}>
                <MenuOutlined /> Gestión de Menús
            </Title>
            <Tag color="blue">Intermedio</Tag>
            <Tag color="purple">Navegación</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="El gestor de menús te permite crear y organizar la navegación de tu sitio web. Puedes tener múltiples menús para diferentes áreas (header, footer, sidebar)."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>¿Cómo crear un nuevo menú?</Title>
            <Steps
                orientation="vertical"
                current={-1}
                items={[
                    {
                        title: 'Haz clic en "Nuevo Menú"',
                        description: 'Define un nombre identificativo (ej: "Menú Principal", "Footer", "Sidebar").'
                    },
                    {
                        title: 'Añade elementos al menú',
                        description: 'Puedes agregar enlaces a páginas, URLs personalizadas o categorías.'
                    },
                    {
                        title: 'Organiza la jerarquía',
                        description: 'Arrastra los elementos para reordenarlos y crear submenús anidados.'
                    },
                    {
                        title: 'Asigna el menú a una ubicación',
                        description: 'Define dónde se mostrará el menú en tu sitio (header, footer, etc).'
                    }
                ]}
            />

            <Divider />

            <Title level={4}>Tipos de Enlaces</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="blue">Página</Tag>
                        <Text> Enlaza a una página interna del sitio</Text>
                    </div>
                    <div>
                        <Tag color="green">URL Personalizada</Tag>
                        <Text> Enlaza a cualquier URL interna o externa</Text>
                    </div>
                    <div>
                        <Tag color="orange">Categoría</Tag>
                        <Text> Enlaza a una categoría de contenido</Text>
                    </div>
                    <div>
                        <Tag color="purple">Menú Desplegable</Tag>
                        <Text> Contenedor que agrupa otros enlaces como submenú</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Configuración de Elementos</Title>
            <Paragraph>
                Cada elemento del menú puede configurarse con:
            </Paragraph>
            <ul>
                <li><Text strong>Etiqueta:</Text> El texto visible del enlace</li>
                <li><Text strong>URL:</Text> La dirección de destino</li>
                <li><Text strong>Título (tooltip):</Text> Texto que aparece al pasar el mouse</li>
                <li><Text strong>Clase CSS:</Text> Para estilos personalizados</li>
                <li><Text strong>Abrir en nueva ventana:</Text> Target _blank</li>
                <li><Text strong>Icono:</Text> Selecciona un icono de la biblioteca</li>
            </ul>

            <Title level={4}>Jerarquía de Menús</Title>
            <Paragraph>
                Puedes crear submenús de hasta 3 niveles de profundidad:
            </Paragraph>
            <ul>
                <li>Nivel 1: Elementos principales</li>
                <li>Nivel 2: Submenú (dropdown)</li>
                <li>Nivel 3: Sub-submenú (mega menu)</li>
            </ul>

            <Title level={4}>Ubicaciones de Menú</Title>
            <Paragraph>
                Los menús pueden asignarse a diferentes ubicaciones:
            </Paragraph>
            <ul>
                <li><Text strong>Header Principal:</Text> Navegación principal del sitio</li>
                <li><Text strong>Header Secundario:</Text> Menú superior auxiliar</li>
                <li><Text strong>Footer:</Text> Enlaces en el pie de página</li>
                <li><Text strong>Sidebar:</Text> Navegación lateral</li>
                <li><Text strong>Mobile:</Text> Menú específico para dispositivos móviles</li>
            </ul>

            <Alert
                message="Consejo"
                description="Mantén los menús simples y con pocas opciones (5-7 elementos principales) para mejorar la experiencia de usuario."
                type="success"
                showIcon
            />
        </div>
    );
}
