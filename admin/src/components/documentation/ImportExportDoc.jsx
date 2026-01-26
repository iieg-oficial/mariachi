import { Typography, Divider, Alert, Steps, Tag, Card, Space } from 'antd';
import { ImportOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function ImportExportDoc() {
    return (
        <div>
            <Title level={2}>
                <ImportOutlined /> Import / Export
            </Title>
            <Tag color="purple">Avanzado</Tag>
            <Tag color="blue">Migración</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="Las herramientas de importación y exportación te permiten mover contenido entre sitios, crear respaldos, y migrar desde otros sistemas CMS."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>Exportar Contenido</Title>
            <Steps
                direction="vertical"
                current={-1}
                items={[
                    {
                        title: 'Selecciona qué exportar',
                        description: 'Páginas, media, menús, configuraciones, o todo el sitio completo.'
                    },
                    {
                        title: 'Elige el formato',
                        description: 'JSON (estructurado), XML (universal), o ZIP (incluye archivos multimedia).'
                    },
                    {
                        title: 'Configura opciones',
                        description: 'Incluir/excluir ciertos elementos, comprimir archivos, etc.'
                    },
                    {
                        title: 'Descarga el archivo',
                        description: 'El sistema genera el archivo de exportación y lo descarga automáticamente.'
                    }
                ]}
            />

            <Divider />

            <Title level={4}>Tipos de Exportación</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="blue">Exportación Completa</Tag>
                        <Text> Todo el contenido del sitio incluyendo configuraciones</Text>
                    </div>
                    <div>
                        <Tag color="green">Exportación de Páginas</Tag>
                        <Text> Solo páginas y su contenido</Text>
                    </div>
                    <div>
                        <Tag color="orange">Exportación de Media</Tag>
                        <Text> Biblioteca multimedia completa</Text>
                    </div>
                    <div>
                        <Tag color="purple">Exportación Selectiva</Tag>
                        <Text> Elige específicamente qué elementos exportar</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Formatos de Exportación</Title>
            <Paragraph>
                Formatos disponibles:
            </Paragraph>
            <ul>
                <li><Text strong>JSON:</Text> Ideal para desarrolladores y respaldos estructurados</li>
                <li><Text strong>XML:</Text> Compatible con otros sistemas CMS</li>
                <li><Text strong>CSV:</Text> Para datos tabulares (usuarios, metadata)</li>
                <li><Text strong>ZIP:</Text> Incluye archivos multimedia y estructura completa</li>
                <li><Text strong>WordPress XML:</Text> Para migrar a/desde WordPress</li>
            </ul>

            <Title level={4}>Importar Contenido</Title>
            <Steps
                direction="vertical"
                current={-1}
                items={[
                    {
                        title: 'Sube el archivo',
                        description: 'Arrastra o selecciona el archivo de importación (JSON, XML, CSV, ZIP).'
                    },
                    {
                        title: 'Valida el contenido',
                        description: 'El sistema analiza el archivo y muestra un resumen de lo que se importará.'
                    },
                    {
                        title: 'Configura opciones',
                        description: 'Decide si sobrescribir contenido existente, mantener IDs, etc.'
                    },
                    {
                        title: 'Ejecuta la importación',
                        description: 'El sistema procesa el archivo y notifica cuando termina.'
                    }
                ]}
            />

            <Title level={4}>Opciones de Importación</Title>
            <Paragraph>
                Configura cómo manejar el contenido importado:
            </Paragraph>
            <ul>
                <li><Text strong>Sobrescribir contenido existente:</Text> Reemplaza elementos con el mismo ID</li>
                <li><Text strong>Crear duplicados:</Text> Importa como nuevo contenido</li>
                <li><Text strong>Actualizar solo cambios:</Text> Solo modifica lo que cambió</li>
                <li><Text strong>Mantener IDs originales:</Text> Preserva los identificadores únicos</li>
                <li><Text strong>Asignar nuevo autor:</Text> Reasigna contenido a otro usuario</li>
                <li><Text strong>Importar como borrador:</Text> Todo entra como borrador para revisión</li>
            </ul>

            <Title level={4}>Migración desde Otros CMS</Title>
            <Paragraph>
                Importa contenido desde:
            </Paragraph>
            <ul>
                <li><Text strong>WordPress:</Text> Usa archivo de exportación XML de WordPress</li>
                <li><Text strong>Drupal:</Text> Exporta a JSON desde Drupal e importa aquí</li>
                <li><Text strong>Joomla:</Text> Compatible con extensiones de exportación</li>
                <li><Text strong>Custom CSV:</Text> Para sistemas propietarios o bases de datos</li>
            </ul>

            <Title level={4}>Respaldos Automáticos</Title>
            <Paragraph>
                Configura respaldos programados:
            </Paragraph>
            <ul>
                <li>Frecuencia: diaria, semanal, mensual</li>
                <li>Hora específica de ejecución</li>
                <li>Qué incluir en el respaldo</li>
                <li>Número de respaldos a mantener</li>
                <li>Ubicación de almacenamiento (local o nube)</li>
                <li>Notificaciones cuando se complete</li>
            </ul>

            <Title level={4}>Resolución de Conflictos</Title>
            <Paragraph>
                Si hay conflictos durante la importación:
            </Paragraph>
            <ul>
                <li>El sistema detecta elementos duplicados</li>
                <li>Muestra una vista de comparación</li>
                <li>Permite elegir qué versión mantener</li>
                <li>Opción de fusionar ambas versiones</li>
                <li>Log detallado de todas las acciones</li>
            </ul>

            <Alert
                message="Precaución"
                description="Siempre crea un respaldo antes de realizar una importación grande. Las importaciones pueden sobrescribir contenido existente si está configurado así."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Alert
                message="Consejo"
                description="Usa exportaciones selectivas periódicas para mantener respaldos de secciones críticas sin ocupar mucho espacio."
                type="success"
                showIcon
            />
        </div>
    );
}
