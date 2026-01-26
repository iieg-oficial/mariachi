import { Typography, Divider, Alert, Tag, Card, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function SearchDoc() {
    return (
        <div>
            <Title level={2}>
                <SearchOutlined /> Búsqueda de Contenido
            </Title>
            <Tag color="blue">Utilidad</Tag>
            <Tag color="green">Búsqueda Avanzada</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="La búsqueda de contenido te permite encontrar rápidamente páginas, archivos multimedia y otros elementos dentro del CMS usando filtros avanzados."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>Tipos de Búsqueda</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="blue">Búsqueda Global</Tag>
                        <Text> Busca en todos los tipos de contenido simultáneamente</Text>
                    </div>
                    <div>
                        <Tag color="green">Búsqueda de Páginas</Tag>
                        <Text> Solo páginas del sitio web</Text>
                    </div>
                    <div>
                        <Tag color="orange">Búsqueda de Media</Tag>
                        <Text> Archivos multimedia (imágenes, videos, documentos)</Text>
                    </div>
                    <div>
                        <Tag color="purple">Búsqueda de Usuarios</Tag>
                        <Text> Usuarios del sistema</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Filtros Disponibles</Title>
            <Paragraph>
                Refina tu búsqueda con estos filtros:
            </Paragraph>
            <ul>
                <li><Text strong>Tipo de Contenido:</Text> Páginas, posts, media, usuarios</li>
                <li><Text strong>Estado:</Text> Publicado, borrador, pendiente, papelera</li>
                <li><Text strong>Autor:</Text> Filtra por quien creó el contenido</li>
                <li><Text strong>Fecha:</Text> Rango de fechas de creación o modificación</li>
                <li><Text strong>Categoría:</Text> Categorías asignadas al contenido</li>
                <li><Text strong>Etiquetas:</Text> Etiquetas del contenido</li>
            </ul>

            <Title level={4}>Operadores de Búsqueda</Title>
            <Paragraph>
                Usa operadores para búsquedas más precisas:
            </Paragraph>
            <ul>
                <li><Text code>"frase exacta"</Text> - Busca una frase exacta entre comillas</li>
                <li><Text code>palabra1 AND palabra2</Text> - Ambas palabras deben estar presentes</li>
                <li><Text code>palabra1 OR palabra2</Text> - Al menos una palabra debe estar presente</li>
                <li><Text code>-palabra</Text> - Excluye resultados con esta palabra</li>
                <li><Text code>palabra*</Text> - Comodín para variaciones de la palabra</li>
            </ul>

            <Title level={4}>Campos de Búsqueda</Title>
            <Paragraph>
                Especifica dónde buscar:
            </Paragraph>
            <ul>
                <li><Text strong>Título:</Text> Solo en los títulos de contenido</li>
                <li><Text strong>Contenido:</Text> Dentro del cuerpo del texto</li>
                <li><Text strong>Metadatos:</Text> Meta descripción y palabras clave</li>
                <li><Text strong>URL:</Text> En los slugs y URLs</li>
                <li><Text strong>Todo:</Text> Búsqueda en todos los campos</li>
            </ul>

            <Title level={4}>Resultados de Búsqueda</Title>
            <Paragraph>
                Los resultados muestran:
            </Paragraph>
            <ul>
                <li>Título del contenido con fragmentos relevantes destacados</li>
                <li>Tipo de contenido e icono identificativo</li>
                <li>Estado actual (publicado, borrador, etc.)</li>
                <li>Fecha de última modificación</li>
                <li>Autor del contenido</li>
                <li>Acciones rápidas (editar, ver, eliminar)</li>
            </ul>

            <Title level={4}>Búsqueda en el Sitio Público</Title>
            <Paragraph>
                Configura la búsqueda para visitantes del sitio:
            </Paragraph>
            <ul>
                <li>Habilitar/deshabilitar búsqueda pública</li>
                <li>Personalizar el formulario de búsqueda</li>
                <li>Configurar qué contenido es buscable</li>
                <li>Diseñar la página de resultados</li>
                <li>Sugerencias automáticas mientras escribes</li>
            </ul>

            <Alert
                message="Consejo"
                description="Usa la búsqueda global (Ctrl + K) para acceder rápidamente a cualquier contenido sin importar en qué página del CMS estés."
                type="success"
                showIcon
            />
        </div>
    );
}
