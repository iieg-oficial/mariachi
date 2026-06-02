import { Button, Col, Form, Input, InputNumber, Row, Select, Space, Typography } from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import LayerTreeSelect from '@features/mapalab-api-keys/components/LayerTreeSelect';

const { Text } = Typography;


export default function ApiKeyEditorForm({
    form,
    editing,
    saving,
    onCancel,
    onSubmit,
    embedded = false,
}) {
    const isCreate = !editing;
    return (
        <Form form={form} layout="vertical" style={embedded ? { padding: '12px 0' } : undefined}>
            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="institucion_nombre"
                        label="Nombre de la dependencia o institución"
                        tooltip="Quién va a usar esta llave para mostrar el mapa en su sitio. Solo es una etiqueta para identificarla en este panel."
                        rules={[
                            { required: true, message: 'Captura el nombre de la institución' },
                            { max: 150, message: 'El nombre no debe pasar de 150 caracteres' },
                        ]}
                    >
                        <Input placeholder="Ejemplo: Secretaría de Salud Jalisco" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="institucion_email_contacto"
                        label="Correo de contacto"
                        tooltip="A quién avisar si la llave deja de funcionar, hay un problema o se acerca el límite de uso."
                        rules={[{ type: 'email', message: 'El correo no parece válido' }]}
                    >
                        <Input placeholder="Ejemplo: contacto@salud.jalisco.gob.mx" />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item
                name="descripcion"
                label="¿Para qué se va a usar?"
                tooltip="Una breve descripción del proyecto o página donde se mostrará el mapa. Ayuda a recordar después por qué se creó esta llave."
            >
                <Input.TextArea rows={2} placeholder="Ejemplo: Página de promoción de servicios de salud — sección Cobertura" />
            </Form.Item>

            <Form.Item
                name="visibility"
                label="Tipo de llave"
                tooltip="Pública: se usa en páginas web normales (la llave va dentro del HTML que ve cualquier visitante; por eso requiere lista de sitios permitidos). Privada: solo para sistemas que llaman al mapa desde su servidor (más estricta, con lista de direcciones IP)."
                extra={
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        ¿Es para un agente o IA (servidor MCP)? Usa <Text strong>Privada</Text>, o Pública con el sitio <Text code>*</Text>: el MCP no envía un dominio, así que una llave pública con sitios concretos será rechazada.
                    </Text>
                }
                rules={[{ required: true, message: 'Selecciona el tipo' }]}
            >
                <Select
                    disabled={Boolean(editing)}
                    options={[
                        { value: 'public', label: 'Pública (para mostrar el mapa en una página web)' },
                        { value: 'private', label: 'Privada (para usar desde otro sistema/servidor)' },
                    ]}
                    placeholder="Selecciona el tipo"
                />
            </Form.Item>

            <Form.Item
                name="dominios_permitidos"
                label="Sitios web donde se permite mostrar el mapa"
                tooltip="Solo las páginas que pertenezcan a estos sitios podrán cargar el mapa. Si alguien intenta usar la llave desde otro lado, recibe un error. Para llaves públicas es obligatorio capturar al menos uno."
                extra={
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        Escribe la dirección completa y presiona Enter. Para permitir subdominios usa <Text code>*.dependencia.gob.mx</Text>.
                    </Text>
                }
            >
                <Select
                    mode="tags"
                    placeholder="Ejemplo: https://salud.jalisco.gob.mx (Enter para agregar)"
                    tokenSeparators={[',', ' ']}
                />
            </Form.Item>

            <Form.Item
                name="ips_permitidas"
                label="Direcciones IP permitidas (opcional, solo para llaves privadas)"
                tooltip="Si llenas este campo, solo los servidores con esas direcciones IP podrán usar la llave. Déjalo vacío si no quieres restringir por IP."
                extra={<Text type="secondary" style={{ fontSize: 11 }}>Vacío = sin restricción por IP. Para llaves públicas se ignora.</Text>}
            >
                <Select
                    mode="tags"
                    placeholder="Ejemplo: 200.123.45.67 (Enter para agregar)"
                    tokenSeparators={[',', ' ']}
                />
            </Form.Item>

            <Form.Item
                name="capas_permitidas"
                label="Capas del mapa que esta llave puede mostrar"
                tooltip="Si dejas este campo vacío, la llave podrá mostrar cualquier capa pública del visor. Si seleccionas capas específicas, solo esas se podrán pedir con esta llave (todo lo demás devuelve error)."
                extra={<Text type="secondary" style={{ fontSize: 11 }}>Vacío = todas las capas públicas disponibles.</Text>}
            >
                <LayerTreeSelect placeholder="Déjalo vacío para permitir todas las capas, o selecciona las específicas" />
            </Form.Item>

            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="cuota_diaria"
                        label="Máximo de peticiones por día"
                        tooltip="Cuántas veces al día se puede pedir el mapa con esta llave en total. Cuando se pasa, el mapa deja de cargar hasta el día siguiente. Déjalo vacío para no poner tope."
                        extra={<Text type="secondary" style={{ fontSize: 11 }}>Sugerido: 10,000. Vacío = sin tope diario.</Text>}
                    >
                        <InputNumber
                            min={1}
                            max={10000000}
                            style={{ width: '100%' }}
                            placeholder="Ejemplo: 10000"
                            formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                            parser={(value) => value?.replace(/,/g, '') ?? ''}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="cuota_mensual"
                        label="Máximo de peticiones por mes"
                        tooltip="Cuántas veces al mes se puede pedir el mapa con esta llave en total. Cuando se pasa, el mapa deja de cargar hasta el mes siguiente. Déjalo vacío para no poner tope."
                        extra={<Text type="secondary" style={{ fontSize: 11 }}>Sugerido: 200,000. Vacío = sin tope mensual.</Text>}
                    >
                        <InputNumber
                            min={1}
                            max={300000000}
                            style={{ width: '100%' }}
                            placeholder="Ejemplo: 200000"
                            formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                            parser={(value) => value?.replace(/,/g, '') ?? ''}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item
                name="notas_admin"
                label="Notas internas (solo administradores)"
                tooltip="Comentarios para el equipo de IIEG. No se comparten con la institución y no afectan el funcionamiento de la llave."
            >
                <Input.TextArea rows={2} placeholder="Ejemplo: Llave para campaña 2026, solicitada por Lic. Pérez (correo del 5/abr)" />
            </Form.Item>

            {isCreate && (
                <Form.Item
                    name="embeds_iniciales"
                    label="Mapas guardados a vincular (opcional)"
                    tooltip="Si ya tienes códigos de mapas creados desde el visor MapaLab, pégalos aquí. Quedarán enlazados a esta llave de inmediato y nunca van a expirar."
                    extra={<Text type="secondary" style={{ fontSize: 11 }}>Pega un código y Enter para cada uno. También puedes guardarlos después desde la pestaña "Previsualizar y embeber".</Text>}
                >
                    <Select
                        mode="tags"
                        placeholder="Ejemplo: zoqpv4eu2t (Enter para agregar)"
                        tokenSeparators={[',', ' ']}
                    />
                </Form.Item>
            )}

            <Space wrap>
                <Button icon={<CloseOutlined />} onClick={onCancel}>Cancelar</Button>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSubmit}>
                    {editing ? 'Guardar cambios' : 'Crear llave y generar contraseña'}
                </Button>
            </Space>
        </Form>
    );
}
