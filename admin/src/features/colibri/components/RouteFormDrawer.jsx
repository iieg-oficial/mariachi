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

const DESTINOS = [
    { value: 'discord', label: 'Discord' },
    { value: 'slack', label: 'Slack' },
    { value: 'webhook', label: 'Webhook genérico' },
    { value: 'email', label: 'Email (pendiente)' },
];

export default function RouteFormDrawer({
    open,
    onClose,
    onSubmit,
    saving,
    editing,
    form,
    isMobile,
    sourceApps,
    tipos,
    destino,
}) {
    return (
        <Drawer
            title={editing ? `Editar route: ${editing.nombre}` : 'Nueva route'}
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
                <Form.Item name="nombre" label="Nombre" rules={[{ required: true }, { max: 150 }]}>
                    <Input placeholder="Bugs de mapalab → Slack #datos" />
                </Form.Item>
                <Form.Item name="source_app_id" label="Source app (vacío = todas)">
                    <Select
                        allowClear
                        placeholder="Todas las apps"
                        options={sourceApps.map((s) => ({ value: s.id, label: `${s.nombre} (${s.slug})` }))}
                    />
                </Form.Item>
                <Form.Item name="tipo_id" label="Tipo de reporte (vacío = todos)">
                    <Select
                        allowClear
                        placeholder="Todos los tipos"
                        options={tipos.map((t) => ({ value: t.id, label: t.label }))}
                    />
                </Form.Item>
                <Form.Item name="destino" label="Destino" rules={[{ required: true }]}>
                    <Select options={DESTINOS} />
                </Form.Item>

                {destino === 'email' ? (
                    <Form.Item
                        name="to"
                        label="Email destinatario"
                        rules={[{ required: true, message: 'Requerido' }, { type: 'email' }]}
                    >
                        <Input placeholder="reportes@iieg.gob.mx" />
                    </Form.Item>
                ) : (
                    <Form.Item
                        name="url"
                        label="Webhook URL"
                        rules={[{ required: true, message: 'Requerido' }, { type: 'url' }]}
                    >
                        <Input placeholder="https://hooks.slack.com/services/…" />
                    </Form.Item>
                )}

                <Form.Item name="filtros_estados" label="Filtrar por estado (opcional)">
                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="Todos los estados"
                        options={[
                            { value: 'nuevo', label: 'Nuevo' },
                            { value: 'en_revision', label: 'En revisión' },
                            { value: 'resuelto', label: 'Resuelto' },
                            { value: 'descartado', label: 'Descartado' },
                        ]}
                    />
                </Form.Item>
                <Form.Item name="filtros_tipos" label="Filtrar por tipos (opcional)">
                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="Todos los tipos"
                        options={tipos.map((t) => ({ value: t.slug, label: t.label }))}
                    />
                </Form.Item>

                <Form.Item name="orden" label="Orden" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: 120 }} />
                </Form.Item>
                <Form.Item name="activo" label="Activa" valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
        </Drawer>
    );
}
