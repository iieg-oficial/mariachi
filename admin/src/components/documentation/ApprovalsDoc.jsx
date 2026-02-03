import { Typography, Divider, Alert, Steps, Tag, Card, Space } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function ApprovalsDoc() {
    return (
        <div>
            <Title level={2}>
                <CheckCircleOutlined /> Sistema de Aprobaciones
            </Title>
            <Tag color="orange">Workflow</Tag>
            <Tag color="blue">Gestión</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="El sistema de aprobaciones permite revisar y aprobar cambios en el contenido antes de que se publiquen, garantizando control de calidad y flujos de trabajo organizados."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>¿Cómo funciona el proceso?</Title>
            <Steps
                orientation="vertical"
                current={-1}
                items={[
                    {
                        title: 'Editor crea o modifica contenido',
                        description: 'El editor trabaja en una página y la marca como lista para revisión.'
                    },
                    {
                        title: 'Solicitud de aprobación',
                        description: 'El contenido pasa a estado "Pendiente de Aprobación" y notifica a los revisores.'
                    },
                    {
                        title: 'Revisión del contenido',
                        description: 'Los aprobadores revisan el contenido y pueden aprobar, rechazar o solicitar cambios.'
                    },
                    {
                        title: 'Aprobación o rechazo',
                        description: 'Si se aprueba, el contenido puede publicarse. Si se rechaza, vuelve al editor con comentarios.'
                    }
                ]}
            />

            <Divider />

            <Title level={4}>Roles en el Proceso</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="blue">Editor</Tag>
                        <Text> Crea contenido y solicita aprobación</Text>
                    </div>
                    <div>
                        <Tag color="purple">Revisor</Tag>
                        <Text> Revisa contenido y proporciona feedback</Text>
                    </div>
                    <div>
                        <Tag color="green">Aprobador</Tag>
                        <Text> Aprueba o rechaza contenido para publicación</Text>
                    </div>
                    <div>
                        <Tag color="orange">Administrador</Tag>
                        <Text> Gestiona todo el flujo y puede publicar directamente</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Estados de Aprobación</Title>
            <Paragraph>
                El contenido puede estar en diferentes estados:
            </Paragraph>
            <ul>
                <li><Tag color="default">Borrador</Tag> - Aún en edición, no listo para revisar</li>
                <li><Tag color="warning">Pendiente</Tag> - Esperando revisión</li>
                <li><Tag color="processing">En Revisión</Tag> - Siendo revisado actualmente</li>
                <li><Tag color="success">Aprobado</Tag> - Listo para publicar</li>
                <li><Tag color="error">Rechazado</Tag> - Requiere cambios</li>
                <li><Tag color="green">Publicado</Tag> - Visible públicamente</li>
            </ul>

            <Title level={4}>Acciones Disponibles</Title>
            <Paragraph>
                Como aprobador, puedes:
            </Paragraph>
            <ul>
                <li><Text strong>Aprobar:</Text> Marcar el contenido como listo para publicación</li>
                <li><Text strong>Rechazar:</Text> Devolver al editor con comentarios específicos</li>
                <li><Text strong>Solicitar Cambios:</Text> Pedir modificaciones antes de aprobar</li>
                <li><Text strong>Comentar:</Text> Añadir notas sin cambiar el estado</li>
                <li><Text strong>Ver Historial:</Text> Revisar todas las versiones anteriores</li>
                <li><Text strong>Comparar Versiones:</Text> Ver diferencias entre versiones</li>
            </ul>

            <Title level={4}>Notificaciones</Title>
            <Paragraph>
                El sistema envía notificaciones automáticas cuando:
            </Paragraph>
            <ul>
                <li>Se solicita una nueva aprobación</li>
                <li>Tu contenido ha sido aprobado</li>
                <li>Tu contenido ha sido rechazado</li>
                <li>Se solicitan cambios en tu contenido</li>
                <li>Alguien comenta en una aprobación que gestionas</li>
            </ul>

            <Title level={4}>Comentarios y Feedback</Title>
            <Paragraph>
                Cada solicitud de aprobación incluye:
            </Paragraph>
            <ul>
                <li>Sistema de comentarios en línea</li>
                <li>Menciones a otros usuarios con @usuario</li>
                <li>Adjuntar archivos de referencia</li>
                <li>Marcar secciones específicas del contenido</li>
                <li>Historial completo de conversaciones</li>
            </ul>

            <Title level={4}>Configuración del Workflow</Title>
            <Paragraph>
                Los administradores pueden configurar:
            </Paragraph>
            <ul>
                <li>Quiénes pueden aprobar contenido</li>
                <li>Número de aprobaciones requeridas</li>
                <li>Aprobación secuencial o paralela</li>
                <li>Tipos de contenido que requieren aprobación</li>
                <li>Plazos límite para revisar</li>
            </ul>

            <Alert
                message="Buenas Prácticas"
                description="Proporciona feedback constructivo y específico cuando rechaces contenido. Menciona exactamente qué necesita mejorarse y por qué."
                type="success"
                showIcon
            />
        </div>
    );
}
