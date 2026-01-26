import { Typography, Divider, Alert, Tag, Card, Space } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function HistoryDoc() {
    return (
        <div>
            <Title level={2}>
                <HistoryOutlined /> Historial de Cambios
            </Title>
            <Tag color="blue">Auditoría</Tag>
            <Tag color="purple">Versionado</Tag>

            <Divider />

            <Alert
                message="Descripción General"
                description="El historial de cambios registra todas las modificaciones realizadas en el sistema, permitiéndote auditar acciones, comparar versiones y restaurar contenido anterior."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Title level={4}>¿Qué se registra?</Title>
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Tag color="blue">Cambios en Páginas</Tag>
                        <Text> Creación, edición, publicación, eliminación</Text>
                    </div>
                    <div>
                        <Tag color="green">Cambios en Media</Tag>
                        <Text> Subida, edición, eliminación de archivos</Text>
                    </div>
                    <div>
                        <Tag color="orange">Cambios en Usuarios</Tag>
                        <Text> Creación, modificación de roles, accesos</Text>
                    </div>
                    <div>
                        <Tag color="purple">Cambios en Configuración</Tag>
                        <Text> Modificaciones en settings, layouts, menús</Text>
                    </div>
                    <div>
                        <Tag color="red">Inicios de Sesión</Tag>
                        <Text> Registro de accesos al sistema</Text>
                    </div>
                </Space>
            </Card>

            <Title level={4}>Información Registrada</Title>
            <Paragraph>
                Cada entrada del historial incluye:
            </Paragraph>
            <ul>
                <li><Text strong>Qué cambió:</Text> Elemento modificado (página, usuario, archivo, etc.)</li>
                <li><Text strong>Quién lo cambió:</Text> Usuario que realizó la acción</li>
                <li><Text strong>Cuándo:</Text> Fecha y hora exacta del cambio</li>
                <li><Text strong>Tipo de acción:</Text> Crear, editar, eliminar, publicar, etc.</li>
                <li><Text strong>Detalles:</Text> Qué campos específicos cambiaron</li>
                <li><Text strong>IP y dispositivo:</Text> Desde dónde se realizó el cambio</li>
            </ul>

            <Title level={4}>Versionado de Contenido</Title>
            <Paragraph>
                El sistema mantiene versiones históricas de tu contenido:
            </Paragraph>
            <ul>
                <li>Cada vez que guardas una página, se crea una nueva versión</li>
                <li>Puedes ver hasta 50 versiones anteriores</li>
                <li>Las versiones antiguas se mantienen por 90 días</li>
                <li>Puedes restaurar cualquier versión anterior</li>
                <li>Compara versiones lado a lado para ver diferencias</li>
            </ul>

            <Title level={4}>Comparación de Versiones</Title>
            <Paragraph>
                Herramientas para comparar cambios:
            </Paragraph>
            <ul>
                <li><Text strong>Vista Unificada:</Text> Muestra cambios en un solo panel con colores</li>
                <li><Text strong>Vista Dividida:</Text> Versión antigua y nueva lado a lado</li>
                <li><Text strong>Resaltado de Diferencias:</Text> Cambios destacados en verde (añadido) y rojo (eliminado)</li>
                <li><Text strong>Navegación por Cambios:</Text> Salta rápidamente entre modificaciones</li>
            </ul>

            <Title level={4}>Restaurar Versiones Anteriores</Title>
            <Paragraph>
                Cómo recuperar contenido anterior:
            </Paragraph>
            <ul>
                <li>Ve al historial de la página</li>
                <li>Selecciona la versión que quieres restaurar</li>
                <li>Vista previa de la versión antes de restaurar</li>
                <li>Haz clic en "Restaurar esta versión"</li>
                <li>Se crea una nueva versión con el contenido restaurado</li>
            </ul>

            <Title level={4}>Filtros de Búsqueda</Title>
            <Paragraph>
                Encuentra cambios específicos fácilmente:
            </Paragraph>
            <ul>
                <li><Text strong>Por Usuario:</Text> Ver solo cambios de un usuario específico</li>
                <li><Text strong>Por Fecha:</Text> Rango de fechas personalizado</li>
                <li><Text strong>Por Tipo:</Text> Solo creaciones, ediciones, eliminaciones, etc.</li>
                <li><Text strong>Por Elemento:</Text> Historial de una página o archivo específico</li>
                <li><Text strong>Por Acción:</Text> Publicaciones, aprobaciones, rechazos, etc.</li>
            </ul>

            <Title level={4}>Auditoría de Seguridad</Title>
            <Paragraph>
                Para administradores, el historial sirve como auditoría:
            </Paragraph>
            <ul>
                <li>Detectar cambios no autorizados</li>
                <li>Revisar quién accedió al sistema y cuándo</li>
                <li>Investigar problemas o errores</li>
                <li>Cumplir con requisitos de compliance</li>
                <li>Generar reportes de actividad</li>
            </ul>

            <Title level={4}>Exportar Historial</Title>
            <Paragraph>
                Opciones de exportación:
            </Paragraph>
            <ul>
                <li><Text strong>CSV:</Text> Para análisis en hojas de cálculo</li>
                <li><Text strong>JSON:</Text> Para procesamiento programático</li>
                <li><Text strong>PDF:</Text> Reporte imprimible para auditorías</li>
                <li>Filtrar antes de exportar</li>
                <li>Incluir o excluir detalles técnicos</li>
            </ul>

            <Title level={4}>Retención de Datos</Title>
            <Paragraph>
                Políticas de conservación del historial:
            </Paragraph>
            <ul>
                <li>Historial de cambios: conservado indefinidamente</li>
                <li>Versiones de contenido: 90 días (hasta 50 versiones)</li>
                <li>Logs de acceso: 180 días</li>
                <li>Archivos eliminados: 30 días en papelera</li>
                <li>Los administradores pueden ajustar estos periodos</li>
            </ul>

            <Alert
                message="Importante"
                description="El historial no se puede modificar ni eliminar por usuarios normales. Solo los administradores pueden purgar logs antiguos si es necesario."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Alert
                message="Consejo"
                description="Revisa periódicamente el historial de tu propio contenido para entender cómo ha evolucionado y aprender de versiones anteriores."
                type="success"
                showIcon
            />
        </div>
    );
}
