import { Typography, Card, Divider, Alert, Steps, Space, Tag } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function PagesDoc() {
    return (
        <div>
            <Title level={2}>
                <FileTextOutlined /> Gestión de Páginas
            </Title>
            <Tag color="blue">Básico</Tag>
            <Tag color="green">Todas las Páginas</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="La gestión de páginas te permite crear, editar y organizar todas las páginas de tu sitio web. Aquí puedes ver el estado de cada página, realizar búsquedas y acceder rápidamente al editor."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>¿Cómo crear una nueva página?</Title>
            <Steps
                direction="vertical"
                current={-1}
                items={[
                    {
                        title: 'Haz clic en "Nueva Página"',
                        description: 'En la esquina superior derecha de la pantalla de páginas.'
                    },
                    {
                        title: 'Completa la información básica',
                        description: 'Ingresa el título de la página, el slug (URL) y una descripción breve.'
                    },
                    {
                        title: 'Selecciona una plantilla (opcional)',
                        description: 'Puedes comenzar desde cero o usar una plantilla predefinida.'
                    },
                    {
                        title: 'Guarda y comienza a editar',
                        description: 'La página se creará y se abrirá automáticamente el editor.'
                    }
                ]}
            />

            <Divider />

            <Title level={4}>Estados de una Página</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="default">Borrador</Tag>
                        <Text> - La página está en creación y no es visible públicamente.</Text>
                    </div>
                    <div>
                        <Tag color="warning">Pendiente de Aprobación</Tag>
                        <Text> - La página está esperando revisión de un administrador.</Text>
                    </div>
                    <div>
                        <Tag color="processing">Aprobada</Tag>
                        <Text> - La página ha sido aprobada pero no está publicada aún.</Text>
                    </div>
                    <div>
                        <Tag color="success">Publicada</Tag>
                        <Text> - La página está visible públicamente en el sitio web.</Text>
                    </div>
                    <div>
                        <Tag color="error">Rechazada</Tag>
                        <Text> - La página fue rechazada y requiere cambios.</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Acciones Rápidas</Title>
            <ul>
                <li><Text strong>Editar:</Text> Abre el editor de páginas con el contenido actual</li>
                <li><Text strong>Vista Previa:</Text> Muestra cómo se verá la página sin publicarla</li>
                <li><Text strong>Duplicar:</Text> Crea una copia de la página con todo su contenido</li>
                <li><Text strong>Mover a Papelera:</Text> Envía la página a la papelera (puede restaurarse)</li>
            </ul>

            <Alert
                message="Consejo"
                description="Usa el buscador para encontrar páginas rápidamente por título, descripción o slug."
                type="success"
                showIcon
            />
        </div>
    );
}
