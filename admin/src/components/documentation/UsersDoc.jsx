import { Typography, Divider, Alert, Steps, Tag, Card, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function UsersDoc() {
    return (
        <div>
            <Title level={2}>
                <UserOutlined /> Gestión de Usuarios
            </Title>
            <Tag color="red">Administración</Tag>
            <Tag color="blue">Permisos</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="La gestión de usuarios te permite administrar quién tiene acceso al CMS, qué roles tienen, y qué permisos tienen asignados."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>¿Cómo crear un nuevo usuario?</Title>
            <Steps
                orientation="vertical"
                current={-1}
                items={[
                    {
                        title: 'Haz clic en "Nuevo Usuario"',
                        description: 'En la página de gestión de usuarios.'
                    },
                    {
                        title: 'Completa la información',
                        description: 'Nombre, email, contraseña inicial y rol.'
                    },
                    {
                        title: 'Asigna permisos',
                        description: 'Define qué puede hacer este usuario en el sistema.'
                    },
                    {
                        title: 'Envía invitación',
                        description: 'El usuario recibirá un email con instrucciones de acceso.'
                    }
                ]}
            />

            <Divider />

            <Title level={4}>Roles de Usuario</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="red">Administrador (tetlamamakani)</Tag>
                        <Text> Control total del sistema, todos los permisos</Text>
                    </div>
                    <div>
                        <Tag color="orange">Editor (editora)</Tag>
                        <Text> Puede crear, editar y publicar contenido</Text>
                    </div>
                    <div>
                        <Tag color="blue">Diseñador (diseñadora)</Tag>
                        <Text> Puede gestionar layouts, estilos y diseño visual</Text>
                    </div>
                    <div>
                        <Tag color="green">Revisor</Tag>
                        <Text> Puede revisar y aprobar contenido pero no publicar</Text>
                    </div>
                    <div>
                        <Tag color="purple">Contribuidor</Tag>
                        <Text> Puede crear contenido pero requiere aprobación</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Permisos por Rol</Title>
            <Paragraph>
                <Text strong>Administrador (tetlamamakani):</Text>
            </Paragraph>
            <ul>
                <li>Acceso completo a todas las funcionalidades</li>
                <li>Gestionar usuarios y roles</li>
                <li>Configurar el sistema</li>
                <li>Ver historial completo de cambios</li>
                <li>Gestionar aprobaciones</li>
                <li>Import/Export</li>
            </ul>

            <Paragraph>
                <Text strong>Editor (editora):</Text>
            </Paragraph>
            <ul>
                <li>Crear, editar y eliminar páginas</li>
                <li>Publicar contenido directamente</li>
                <li>Gestionar biblioteca multimedia</li>
                <li>Buscar contenido</li>
                <li>Acceder a la papelera</li>
                <li>Gestionar SEO y redirecciones</li>
            </ul>

            <Paragraph>
                <Text strong>Diseñador (diseñadora):</Text>
            </Paragraph>
            <ul>
                <li>Gestionar layouts y estilos</li>
                <li>Crear y modificar menús</li>
                <li>Gestionar iconos</li>
                <li>Acceder a biblioteca multimedia</li>
                <li>Crear y editar páginas</li>
            </ul>

            <Paragraph>
                <Text strong>Revisor:</Text>
            </Paragraph>
            <ul>
                <li>Ver todo el contenido</li>
                <li>Aprobar o rechazar cambios</li>
                <li>Añadir comentarios de revisión</li>
                <li>Ver historial de cambios</li>
            </ul>

            <Paragraph>
                <Text strong>Contribuidor:</Text>
            </Paragraph>
            <ul>
                <li>Crear nuevo contenido (solo borradores)</li>
                <li>Editar su propio contenido</li>
                <li>Solicitar aprobación para publicar</li>
                <li>Subir archivos a biblioteca multimedia</li>
            </ul>

            <Title level={4}>Gestión de Perfiles</Title>
            <Paragraph>
                Cada usuario puede configurar su perfil:
            </Paragraph>
            <ul>
                <li><Text strong>Información Personal:</Text> Nombre, biografía, foto de perfil</li>
                <li><Text strong>Contacto:</Text> Email, teléfono, redes sociales</li>
                <li><Text strong>Contraseña:</Text> Cambiar contraseña de acceso</li>
                <li><Text strong>Notificaciones:</Text> Configurar qué notificaciones recibir</li>
                <li><Text strong>Idioma:</Text> Seleccionar idioma de interfaz</li>
                <li><Text strong>Zona Horaria:</Text> Para fechas y horarios correctos</li>
            </ul>

            <Title level={4}>Seguridad</Title>
            <Paragraph>
                Características de seguridad del sistema:
            </Paragraph>
            <ul>
                <li>Autenticación de dos factores (2FA) opcional</li>
                <li>Políticas de contraseña robustas</li>
                <li>Expiración de sesión automática</li>
                <li>Log de actividad de usuarios</li>
                <li>Detección de inicios de sesión sospechosos</li>
                <li>Recuperación de contraseña vía email</li>
            </ul>

            <Title level={4}>Monitoreo de Actividad</Title>
            <Paragraph>
                Los administradores pueden ver:
            </Paragraph>
            <ul>
                <li>Último inicio de sesión de cada usuario</li>
                <li>Actividad reciente (páginas editadas, archivos subidos)</li>
                <li>Estadísticas de uso del sistema</li>
                <li>Historial completo de acciones</li>
                <li>Usuarios activos en tiempo real</li>
            </ul>

            <Title level={4}>Desactivar o Eliminar Usuarios</Title>
            <Paragraph>
                Opciones para gestionar usuarios inactivos:
            </Paragraph>
            <ul>
                <li><Text strong>Desactivar:</Text> El usuario no puede acceder pero su contenido se mantiene</li>
                <li><Text strong>Eliminar:</Text> Borra al usuario y opcionalmente reasigna su contenido</li>
                <li><Text strong>Suspender Temporalmente:</Text> Bloqueo temporal del acceso</li>
            </ul>

            <Alert
                message="Consejo de Seguridad"
                description="Revisa periódicamente los usuarios con rol de Administrador. Solo asigna este rol a personas de total confianza."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Alert
                message="Buena Práctica"
                description="Usa el principio de mínimo privilegio: asigna a cada usuario solo los permisos que realmente necesita para su trabajo."
                type="success"
                showIcon
            />
        </div>
    );
}
