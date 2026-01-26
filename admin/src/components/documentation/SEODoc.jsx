import { Typography, Divider, Alert, Tag } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function SEODoc() {
    return (
        <div>
            <Title level={2}>
                <GlobalOutlined /> SEO y Analytics
            </Title>
            <Tag color="blue">Avanzado</Tag>
            <Tag color="green">Optimización</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="Las herramientas SEO y Analytics te ayudan a mejorar el posicionamiento en buscadores y medir el rendimiento de tu sitio."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>SEO Analyzer</Title>
            <Paragraph>
                El analizador SEO evalúa cada página y proporciona una puntuación de 0-100 basada en:
            </Paragraph>
            <ul>
                <li>Longitud y optimización del meta título (50-60 caracteres ideal)</li>
                <li>Longitud y optimización de la meta descripción (150-160 caracteres)</li>
                <li>Densidad de palabras clave (0.5-3% recomendado)</li>
                <li>Estructura de contenido (títulos, imágenes con alt text)</li>
                <li>Legibilidad del texto</li>
            </ul>

            <Divider />

            <Title level={4}>Sitemap Manager</Title>
            <Paragraph>
                Genera y gestiona el archivo sitemap.xml que ayuda a los buscadores a indexar tu sitio:
            </Paragraph>
            <ul>
                <li>Incluir/excluir páginas específicas</li>
                <li>Establecer prioridad de cada página (0.0 - 1.0)</li>
                <li>Definir frecuencia de cambio (diaria, semanal, mensual)</li>
                <li>Descargar el sitemap.xml generado</li>
            </ul>

            <Title level={4}>Robots.txt Manager</Title>
            <Paragraph>
                Configura qué áreas de tu sitio pueden rastrear los motores de búsqueda:
            </Paragraph>
            <ul>
                <li>Plantillas predefinidas (permitir todo, bloquear todo, estándar)</li>
                <li>Directivas comunes con un clic</li>
                <li>Validación en tiempo real</li>
                <li>Vista previa del archivo robots.txt</li>
            </ul>

            <Title level={4}>Redirects Manager</Title>
            <Paragraph>
                Gestiona redirecciones 301 (permanentes) y 302 (temporales):
            </Paragraph>
            <ul>
                <li>Crear redirecciones desde URLs antiguas a nuevas</li>
                <li>Monitorear visitas a cada redirección</li>
                <li>Activar/desactivar redirecciones sin eliminarlas</li>
            </ul>

            <Title level={4}>Analytics Dashboard</Title>
            <Paragraph>
                Visualiza métricas clave de tu sitio:
            </Paragraph>
            <ul>
                <li>Visitas totales y páginas vistas</li>
                <li>Usuarios en tiempo real</li>
                <li>Fuentes de tráfico (orgánico, directo, redes sociales)</li>
                <li>Dispositivos (desktop, mobile, tablet)</li>
                <li>Páginas más visitadas</li>
                <li>Métricas SEO (posición promedio, impresiones, CTR)</li>
            </ul>

            <Alert
                message="Integración con Google"
                description="Para datos reales, conecta tu cuenta de Google Analytics 4 y Google Search Console en la configuración del sistema."
                type="warning"
                showIcon
            />
        </div>
    );
}
