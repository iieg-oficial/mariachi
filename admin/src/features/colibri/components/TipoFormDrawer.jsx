import {
    Button,
    Drawer,
    Form,
    Input,
    InputNumber,
    Select,
    Space,
    Switch,
    Tabs,
    Tag,
} from 'antd';
import FormSchemaEditor from '@features/colibri/components/FormSchemaEditor';

const COLOR_OPTIONS = [
    'red', 'volcano', 'orange', 'gold', 'yellow', 'lime', 'green', 'cyan',
    'blue', 'geekblue', 'purple', 'magenta', 'default',
];

function FormSchemaInput({ value, onChange }) {
    return (
        <FormSchemaEditor
            value={value || { campos: [] }}
            onChange={(next) => onChange?.(next)}
        />
    );
}

export default function TipoFormDrawer({
    open,
    onClose,
    onSubmit,
    saving,
    editing,
    form,
    isMobile,
    onLabelChange,
}) {
    return (
        <Drawer
            title={editing ? `Editar tipo: ${editing.label}` : 'Nuevo tipo'}
            open={open}
            size={isMobile ? '100%' : 640}
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
                <Tabs
                    defaultActiveKey="general"
                    items={[
                        {
                            key: 'general',
                            label: 'General',
                            forceRender: true,
                            children: (
                                <>
                                    <Form.Item
                                        name="label"
                                        label="Etiqueta visible"
                                        rules={[{ required: true, message: 'Requerido' }, { max: 100 }]}
                                    >
                                        <Input placeholder="Ej. Datos incorrectos" onChange={onLabelChange} />
                                    </Form.Item>
                                    <Form.Item
                                        name="slug"
                                        label="Slug (identificador interno)"
                                        tooltip="Solo minúsculas, números y _. No se puede cambiar después de crear."
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { pattern: /^[a-z0-9_]+$/, message: 'Solo a-z, 0-9 y _' },
                                        ]}
                                    >
                                        <Input placeholder="datos_incorrectos" disabled={Boolean(editing)} />
                                    </Form.Item>
                                    <Form.Item name="color" label="Color del Tag" rules={[{ required: true }]}>
                                        <Select
                                            options={COLOR_OPTIONS.map((c) => ({
                                                value: c,
                                                label: <Tag color={c}>{c}</Tag>,
                                            }))}
                                        />
                                    </Form.Item>
                                    <Form.Item name="icon" label="Icono (opcional)" tooltip="Slug del icono — uso futuro en widget">
                                        <Input placeholder="bug, flag, bulb…" />
                                    </Form.Item>
                                    <Form.Item name="descripcion" label="Descripción">
                                        <Input.TextArea rows={3} placeholder="Cuándo usar este tipo. Se mostrará al usuario al elegir." />
                                    </Form.Item>
                                    <Form.Item name="orden" label="Orden" rules={[{ required: true }]}>
                                        <InputNumber min={0} style={{ width: 120 }} />
                                    </Form.Item>
                                    <Form.Item name="activo" label="Activo" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </>
                            ),
                        },
                        {
                            key: 'formulario',
                            label: 'Formulario',
                            forceRender: true,
                            children: (
                                <Form.Item name="form_schema" noStyle>
                                    <FormSchemaInput />
                                </Form.Item>
                            ),
                        },
                    ]}
                />
            </Form>
        </Drawer>
    );
}
