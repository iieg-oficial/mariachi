import { Typography, Divider, Alert, Tag, Card, Space, Collapse } from 'antd';
import {
    AppstoreOutlined,
    PictureOutlined,
    HeatMapOutlined,
    InfoCircleOutlined,
    FileDoneOutlined,
    MailOutlined,
    StarOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

export default function PageComponentsDoc() {
    return (
        <div>
            <Title level={2}>
                <AppstoreOutlined /> Componentes de Página
            </Title>
            <Tag color="purple">Secciones</Tag>
            <Tag color="blue">Componentes Avanzados</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="Los componentes de página son secciones completas y prediseñadas que puedes agregar a tus páginas. Cada componente es completamente configurable desde el editor y no requiere código."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>Componentes Disponibles</Title>

            <Collapse accordion style={{ marginBottom: 24 }}>
                <Panel
                    header={
                        <Space>
                            <PictureOutlined style={{ color: '#722ed1' }} />
                            <Text strong>Banner Hero</Text>
                            <Tag color="purple">Destacado</Tag>
                        </Space>
                    }
                    key="hero"
                >
                    <Paragraph>
                        <Text strong>Descripción:</Text> Sección principal de bienvenida para la página de inicio.
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Casos de uso:</Text> Página principal del sitio, landing pages, secciones de bienvenida
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Características configurables:</Text>
                    </Paragraph>
                    <ul>
                        <li>Título y subtítulo personalizables</li>
                        <li>Gradiente de fondo personalizable (clases Tailwind)</li>
                        <li>Hasta 2 botones CTA con tipo (primario/secundario)</li>
                        <li>Sección de estadísticas opcional con 4 métricas</li>
                        <li>Cada estadística tiene valor y etiqueta</li>
                    </ul>
                    <Alert
                        message="Consejo"
                        description="Usa gradientes como 'from-purple-900 to-purple-700' o 'from-blue-600 to-blue-800' para fondos llamativos"
                        type="success"
                        showIcon
                        style={{ marginTop: 8 }}
                    />
                </Panel>

                <Panel
                    header={
                        <Space>
                            <HeatMapOutlined style={{ color: '#1890ff' }} />
                            <Text strong>Carrusel</Text>
                            <Tag color="blue">Interactivo</Tag>
                        </Space>
                    }
                    key="carousel"
                >
                    <Paragraph>
                        <Text strong>Descripción:</Text> Carrusel automático de slides con navegación manual.
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Casos de uso:</Text> Mostrar actualizaciones, noticias, anuncios destacados
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Características configurables:</Text>
                    </Paragraph>
                    <ul>
                        <li>Slides ilimitados con icono/emoji, categoría, título, descripción y enlace</li>
                        <li>Reproducción automática configurable (activar/desactivar)</li>
                        <li>Intervalo personalizable (1000-10000ms)</li>
                        <li>Mostrar/ocultar indicadores de puntos</li>
                        <li>Mostrar/ocultar flechas de navegación</li>
                        <li>Fecha automática en cada slide</li>
                    </ul>
                </Panel>

                <Panel
                    header={
                        <Space>
                            <AppstoreOutlined style={{ color: '#52c41a' }} />
                            <Text strong>Grid de Cards</Text>
                            <Tag color="green">Flexible</Tag>
                        </Space>
                    }
                    key="cardgrid"
                >
                    <Paragraph>
                        <Text strong>Descripción:</Text> Grid responsive de tarjetas con diseño flexible.
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Casos de uso:</Text> Información reciente, sistemas, recursos, servicios
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Características configurables:</Text>
                    </Paragraph>
                    <ul>
                        <li>Título de la sección</li>
                        <li>Número de columnas (1-4, responsive automático)</li>
                        <li>Cards con icono/emoji, badge, título, descripción, enlace</li>
                        <li>Colores de badge: purple, blue, green, orange, red, gray</li>
                        <li>Opción de card destacado con gradiente de fondo</li>
                        <li>Botón CTA opcional al final del grid</li>
                        <li>Fecha automática en cada card</li>
                    </ul>
                    <Alert
                        message="Tip de diseño"
                        description="Los cards destacados tienen fondo de gradiente y son ideales para resaltar sistemas principales"
                        type="info"
                        showIcon
                        style={{ marginTop: 8 }}
                    />
                </Panel>

                <Panel
                    header={
                        <Space>
                            <InfoCircleOutlined style={{ color: '#fa8c16' }} />
                            <Text strong>Sección Informativa</Text>
                            <Tag color="orange">Recursos</Tag>
                        </Space>
                    }
                    key="infosection"
                >
                    <Paragraph>
                        <Text strong>Descripción:</Text> Cards informativos con listas de características y enlaces.
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Casos de uso:</Text> Transparencia, recursos legales, información institucional
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Características configurables:</Text>
                    </Paragraph>
                    <ul>
                        <li>Título de la sección</li>
                        <li>Diseño en grid (2 columnas) o lista (1 columna)</li>
                        <li>Múltiples cards con título y descripción</li>
                        <li>Lista de características con checkmarks verdes</li>
                        <li>Lista de enlaces internos o externos</li>
                    </ul>
                </Panel>

                <Panel
                    header={
                        <Space>
                            <FileDoneOutlined style={{ color: '#eb2f96' }} />
                            <Text strong>Lista de Licitaciones</Text>
                            <Tag color="red">Gubernamental</Tag>
                        </Space>
                    }
                    key="procurement"
                >
                    <Paragraph>
                        <Text strong>Descripción:</Text> Listado especializado de licitaciones y convocatorias.
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Casos de uso:</Text> Publicar licitaciones, convocatorias, procesos de compra
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Características configurables:</Text>
                    </Paragraph>
                    <ul>
                        <li>Título de la sección</li>
                        <li>Lista de licitaciones con título, número, estado, fecha y enlace</li>
                        <li>Estados: Activa (azul), Pendiente (amarillo), Cerrada (gris), Adjudicada (verde)</li>
                        <li>Enlace externo configurable (ej: CompraNet)</li>
                        <li>Guía de participación opcional con pasos numerados</li>
                    </ul>
                </Panel>

                <Panel
                    header={
                        <Space>
                            <MailOutlined style={{ color: '#13c2c2' }} />
                            <Text strong>Formulario de Contacto</Text>
                            <Tag color="cyan">Interactivo</Tag>
                        </Space>
                    }
                    key="contact"
                >
                    <Paragraph>
                        <Text strong>Descripción:</Text> Formulario completo de contacto con información y mapa.
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Casos de uso:</Text> Página de contacto, formularios de consulta
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Características configurables:</Text>
                    </Paragraph>
                    <ul>
                        <li>Título de la sección</li>
                        <li>Información de contacto: dirección, teléfono, email, horario</li>
                        <li>Mapa embebido (Google Maps iframe URL)</li>
                        <li>Campos del formulario configurables (nombre, email, teléfono, asunto, mensaje)</li>
                        <li>Texto del botón de envío personalizable</li>
                        <li>Endpoint de API configurable para procesar el envío</li>
                    </ul>
                    <Alert
                        message="Configuración necesaria"
                        description="Asegúrate de configurar el endpoint de API en el backend para procesar los mensajes del formulario"
                        type="warning"
                        showIcon
                        style={{ marginTop: 8 }}
                    />
                </Panel>

                <Panel
                    header={
                        <Space>
                            <StarOutlined style={{ color: '#faad14' }} />
                            <Text strong>Destacado (Showcase)</Text>
                            <Tag color="gold">Premium</Tag>
                        </Space>
                    }
                    key="showcase"
                >
                    <Paragraph>
                        <Text strong>Descripción:</Text> Sección para destacar sistemas, proyectos o características principales.
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Casos de uso:</Text> Destacar MapaLab, sistemas principales, proyectos especiales
                    </Paragraph>
                    <Paragraph>
                        <Text strong>Características configurables:</Text>
                    </Paragraph>
                    <ul>
                        <li>Título y descripción</li>
                        <li>Lista de características con checkmarks verdes</li>
                        <li>Hasta 2 botones CTA (primario/secundario)</li>
                        <li>Contenido visual: imagen o video embebido</li>
                        <li>Estadísticas opcionales con etiqueta y valor</li>
                        <li>Diseño: dos columnas o centrado</li>
                    </ul>
                </Panel>
            </Collapse>

            <Divider />

            <Title level={4}>Buenas Prácticas</Title>
            <Card size="small">
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Text strong>1. Organización de contenido:</Text>
                        <Paragraph>
                            Usa secciones en orden lógico: Banner Hero al inicio, Carrusel para destacados,
                            Grid de Cards para contenido principal, y Formulario de Contacto al final.
                        </Paragraph>
                    </div>
                    <div>
                        <Text strong>2. Colores consistentes:</Text>
                        <Paragraph>
                            Mantén una paleta de colores coherente. Usa los mismos colores de badge en toda la página
                            para categorías similares (ej: purple para sistemas, blue para publicaciones).
                        </Paragraph>
                    </div>
                    <div>
                        <Text strong>3. Iconos/Emojis:</Text>
                        <Paragraph>
                            Usa emojis o iconos relevantes para cada card o slide. Esto mejora la experiencia visual
                            y ayuda a los usuarios a identificar rápidamente el contenido.
                        </Paragraph>
                    </div>
                    <div>
                        <Text strong>4. Responsive design:</Text>
                        <Paragraph>
                            Todos los componentes son responsive automáticamente. En móvil, los grids de 4 columnas
                            se convierten en 1 columna para mejor legibilidad.
                        </Paragraph>
                    </div>
                </Space>
            </Card>

            <Alert
                message="Nota sobre Tailwind CSS"
                description="Los componentes de sección usan Tailwind CSS para estilos. Puedes personalizar clases de gradiente y colores usando la sintaxis de Tailwind (ej: from-purple-900, bg-blue-600)."
                type="info"
                showIcon
                style={{ marginTop: 24 }}
            />
        </div>
    );
}
