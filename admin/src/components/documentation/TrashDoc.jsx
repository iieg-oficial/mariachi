import { Typography, Divider, Alert, Tag, Card, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function TrashDoc() {
    return (
        <div>
            <Title level={2}>
                <DeleteOutlined /> Papelera de Reciclaje
            </Title>
            <Tag color="red">Recuperación</Tag>
            <Tag color="orange">Gestión</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="La papelera es un espacio de almacenamiento temporal para contenido eliminado. Los elementos permanecen aquí durante 30 días antes de ser eliminados permanentemente."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>¿Qué contiene la Papelera?</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="blue">Páginas</Tag>
                        <Text> Páginas del sitio web eliminadas</Text>
                    </div>
                    <div>
                        <Tag color="green">Media</Tag>
                        <Text> Archivos multimedia eliminados</Text>
                    </div>
                    <div>
                        <Tag color="orange">Menús</Tag>
                        <Text> Elementos de menú eliminados</Text>
                    </div>
                    <div>
                        <Tag color="purple">Layouts</Tag>
                        <Text> Plantillas y layouts eliminados</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Acciones Disponibles</Title>
            <Paragraph>
                Con los elementos en la papelera puedes:
            </Paragraph>
            <ul>
                <li><Text strong>Restaurar:</Text> Devolver el elemento a su ubicación original</li>
                <li><Text strong>Eliminar Permanentemente:</Text> Borrar definitivamente (no se puede recuperar)</li>
                <li><Text strong>Vista Previa:</Text> Ver el contenido antes de restaurar o eliminar</li>
                <li><Text strong>Vaciar Papelera:</Text> Eliminar todos los elementos de una vez</li>
                <li><Text strong>Filtrar:</Text> Buscar elementos específicos por tipo, fecha o autor</li>
            </ul>

            <Title level={4}>Tiempo de Retención</Title>
            <Paragraph>
                Los elementos en la papelera tienen estas características:
            </Paragraph>
            <ul>
                <li>Se mantienen durante <Text strong>30 días</Text> por defecto</li>
                <li>Después de 30 días se eliminan automáticamente</li>
                <li>Se muestra un contador de días restantes para cada elemento</li>
                <li>Los administradores pueden cambiar el tiempo de retención</li>
                <li>Los elementos próximos a eliminarse se destacan con color rojo</li>
            </ul>

            <Title level={4}>Restauración de Elementos</Title>
            <Paragraph>
                Al restaurar un elemento:
            </Paragraph>
            <ul>
                <li>Vuelve a su ubicación y estado original</li>
                <li>Se mantienen todas sus relaciones (categorías, etiquetas, etc.)</li>
                <li>Se preservan los metadatos y configuraciones</li>
                <li>Si restauras una página, sus archivos multimedia relacionados también se restauran</li>
                <li>Recibes una notificación de confirmación</li>
            </ul>

            <Title level={4}>Eliminación Permanente</Title>
            <Alert
                message="¡Atención!"
                description="La eliminación permanente no se puede deshacer. Asegúrate de que realmente quieres eliminar el contenido antes de confirmar."
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
            />
            <Paragraph>
                Cuando eliminas permanentemente:
            </Paragraph>
            <ul>
                <li>El contenido se borra definitivamente de la base de datos</li>
                <li>No hay forma de recuperarlo después</li>
                <li>Se eliminan todos los archivos y metadatos asociados</li>
                <li>Se registra la acción en el historial del sistema</li>
            </ul>

            <Title level={4}>Permisos y Restricciones</Title>
            <Paragraph>
                Control de acceso a la papelera:
            </Paragraph>
            <ul>
                <li><Text strong>Editores:</Text> Solo pueden ver y restaurar su propio contenido</li>
                <li><Text strong>Revisores:</Text> Pueden ver todo pero no eliminar permanentemente</li>
                <li><Text strong>Administradores:</Text> Control total sobre todos los elementos</li>
                <li>Las eliminaciones permanentes requieren confirmación adicional</li>
            </ul>

            <Title level={4}>Búsqueda en la Papelera</Title>
            <Paragraph>
                Encuentra rápidamente lo que buscas:
            </Paragraph>
            <ul>
                <li>Filtra por tipo de contenido</li>
                <li>Busca por título o contenido</li>
                <li>Filtra por autor que eliminó el contenido</li>
                <li>Ordena por fecha de eliminación</li>
                <li>Muestra solo elementos próximos a expirar</li>
            </ul>

            <Alert
                message="Consejo"
                description="Revisa periódicamente la papelera y restaura o elimina permanentemente los elementos que ya no necesites. Esto ayuda a mantener el sistema organizado y libera espacio."
                type="success"
                showIcon
            />
        </div>
    );
}
