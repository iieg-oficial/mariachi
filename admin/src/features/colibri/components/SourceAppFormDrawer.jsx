import {
    Button,
    Drawer,
    Form,
    Input,
    InputNumber,
    Select,
    Space,
    Switch,
} from 'antd';

export default function SourceAppFormDrawer({
    open,
    onClose,
    onSubmit,
    saving,
    editing,
    form,
    isMobile,
    tipos,
}) {
    return (
        <Drawer
            title={editing ? `Editar: ${editing.nombre}` : 'Nuevo source app'}
            open={open}
            size={isMobile ? '100%' : 520}
            onClose={onClose}
            destroyOnClose
            extra={
                <Space>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="primary" loading={saving} onClick={onSubmit}>
                        Guardar
                    </Button>
                </Space>
            }
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="slug"
                    label="Slug"
                    rules={[
                        { required: true, message: 'Requerido' },
                        { pattern: /^[a-z0-9_-]+$/, message: 'Solo a-z, 0-9, _, -' },
                    ]}
                    tooltip="Identificador interno. Va en source_app del reporte. No se puede cambiar después."
                >
                    <Input placeholder="mi-app" disabled={Boolean(editing)} />
                </Form.Item>
                <Form.Item
                    name="nombre"
                    label="Nombre visible"
                    rules={[{ required: true }, { max: 150 }]}
                >
                    <Input placeholder="Mi App" />
                </Form.Item>
                <Form.Item name="descripcion" label="Descripción">
                    <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item
                    name="dominios_permitidos"
                    label="Dominios permitidos (CORS)"
                    tooltip="Origins autorizados a usar la API key pública. Soporta wildcards: *.iieg.gob.mx o * para todos. Vacío = ningún dominio (key inutilizable)."
                >
                    <Select
                        mode="tags"
                        placeholder="https://app.iieg.gob.mx, *.iieg.gob.mx, *"
                        tokenSeparators={[',', ' ']}
                    />
                </Form.Item>
                <Form.Item
                    name="tipos_permitidos"
                    label="Tipos permitidos"
                    tooltip="Si vacío, se permiten todos los tipos activos."
                >
                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="Todos los tipos"
                        options={tipos.map((t) => ({ value: t.slug, label: t.label }))}
                    />
                </Form.Item>
                <Form.Item
                    name="rate_limit_per_hour"
                    label="Rate limit (peticiones/hora por IP)"
                    rules={[{ required: true }]}
                >
                    <InputNumber min={1} max={10000} style={{ width: 160 }} />
                </Form.Item>
                <Form.Item name="notificar_discord" label="Notificar a Discord" valuePropName="checked">
                    <Switch />
                </Form.Item>
                <Form.Item name="discord_webhook_url" label="Webhook Discord (override opcional)">
                    <Input placeholder="https://discord.com/api/webhooks/…" />
                </Form.Item>
                <Form.Item
                    name="disable_pii"
                    label="Modo sin PII"
                    valuePropName="checked"
                    tooltip="Si se activa, el backend purga UA, viewport, identify, breadcrumbs y email_contacto antes de persistir. Útil para huéspedes con políticas estrictas de privacidad."
                >
                    <Switch />
                </Form.Item>
                <Form.Item
                    name="privacy_url"
                    label="URL del aviso de privacidad"
                    tooltip="Mostrada al usuario cuando se requiera consentimiento explícito."
                    rules={[{ max: 500 }]}
                >
                    <Input placeholder="https://iieg.gob.mx/aviso-privacidad" />
                </Form.Item>
                <Form.Item
                    label="Scrubbers personalizados"
                    tooltip="Patrones regex extra para anonimizar campos sensibles antes de persistir. Los defaults (JWT, tokens, CCN) ya están aplicados."
                >
                    <Form.List name="scrubbers">
                        {(fields, { add, remove }) => (
                            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                                {fields.map((field) => (
                                    <Space.Compact key={field.key} style={{ width: '100%' }}>
                                        <Form.Item name={[field.name, 'pattern']} noStyle>
                                            <Input placeholder="Regex (ej. \\bSESSION-\\w+\\b)" />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'replacement']} noStyle>
                                            <Input placeholder="[REDACTED]" style={{ maxWidth: 160 }} />
                                        </Form.Item>
                                        <Button danger onClick={() => remove(field.name)}>×</Button>
                                    </Space.Compact>
                                ))}
                                <Button type="dashed" onClick={() => add({ pattern: '', replacement: '[REDACTED]' })} block>
                                    + Agregar scrubber
                                </Button>
                            </Space>
                        )}
                    </Form.List>
                </Form.Item>
                <Form.Item name="activo" label="Activo" valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
        </Drawer>
    );
}
