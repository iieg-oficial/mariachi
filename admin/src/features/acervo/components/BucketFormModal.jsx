import { Form, Input, Modal, Select, Switch } from 'antd';

const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

export default function BucketFormModal({
    open, editing, projects, form, saving, protegidoAyuda, onOk, onCancel,
}) {
    return (
        <Modal
            open={open}
            title={editing ? 'Editar bucket' : 'Nuevo bucket'}
            okText={editing ? 'Guardar' : 'Crear'}
            cancelText="Cancelar"
            confirmLoading={saving}
            onOk={onOk}
            onCancel={onCancel}
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
                <Form.Item
                    name="project_id"
                    label="Proyecto"
                    rules={[{ required: true, message: 'Selecciona un proyecto' }]}
                >
                    <Select
                        disabled={!!editing}
                        placeholder="Proyecto al que pertenece"
                        options={projects.map((p) => ({ value: p.id, label: p.name }))}
                    />
                </Form.Item>

                <Form.Item
                    name="acervo_bucket"
                    label="Bucket (nombre en el almacenamiento)"
                    rules={editing ? [] : [
                        { required: true, message: 'Ingresa el nombre del bucket' },
                        {
                            pattern: BUCKET_NAME_PATTERN,
                            message: 'Solo minúsculas, números, puntos y guiones (3-63)',
                        },
                    ]}
                    extra={editing ? 'El nombre del bucket no puede cambiarse.' : undefined}
                >
                    <Input disabled={!!editing} placeholder="p. ej. mariachi" />
                </Form.Item>

                <Form.Item
                    name="access_key_ref"
                    label="Prefijo de credencial"
                    rules={editing ? [] : [{ required: true, message: 'Ingresa el prefijo de credencial' }]}
                    extra={editing
                        ? 'El prefijo de credencial no puede cambiarse.'
                        : 'Prefijo de la credencial en el .env, p. ej. ACERVO_MARIACHI (se leen ACERVO_MARIACHI_ACCESS_KEY / _SECRET_KEY).'}
                >
                    <Input disabled={!!editing} placeholder="p. ej. ACERVO_MARIACHI" />
                </Form.Item>

                <Form.Item
                    name="display_name"
                    label="Nombre visible"
                    rules={[{ required: true, message: 'Ingresa un nombre visible' }]}
                >
                    <Input placeholder="Nombre mostrado en la UI" />
                </Form.Item>

                <Form.Item name="is_public" label="Público" valuePropName="checked">
                    <Switch />
                </Form.Item>

                <Form.Item
                    name="protegido"
                    label="Protegido"
                    valuePropName="checked"
                    tooltip={protegidoAyuda}
                >
                    <Switch />
                </Form.Item>

                <Form.Item name="is_active" label="Activo" valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
}
