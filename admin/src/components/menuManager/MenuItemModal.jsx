import { Modal, Form, Input, Alert, Radio, Select, Space, Switch, Tag } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, StopOutlined } from '@ant-design/icons';
import { PREDEFINED_ICONS } from '@constants/menuConstants';

export default function MenuItemModal({
    visible,
    editingItem,
    selectedParent,
    form,
    urlPreview,
    iconType,
    onCancel,
    onSubmit,
    onLabelChange,
    onIconTypeChange
}) {
    return (
        <Modal
            title={
                editingItem
                    ? 'Editar Item del Menú'
                    : selectedParent
                        ? `Agregar hijo a "${selectedParent.label}"`
                        : 'Nuevo Item del Menú'
            }
            open={visible}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText={editingItem ? 'Actualizar' : 'Crear'}
            cancelText="Cancelar"
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}
                initialValues={{
                    status: 'visible',
                    external: false,
                    order: 0
                }}
            >
                <Form.Item
                    label={<span style={{ fontSize: 14, fontWeight: 500 }}>Nombre</span>}
                    name="label"
                    rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
                >
                    <Input
                        size="large"
                        placeholder="Inicio, Acerca de, Contacto..."
                        onChange={onLabelChange}
                    />
                </Form.Item>

                <Alert
                    message="Ruta generada automáticamente"
                    description={
                        <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 8, color: '#1890ff' }}>
                            {urlPreview}
                        </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Form.Item
                    label={<span style={{ fontSize: 14, fontWeight: 500 }}>Icono</span>}
                >
                    <Radio.Group
                        value={iconType}
                        onChange={onIconTypeChange}
                        style={{ marginBottom: 16 }}
                    >
                        <Radio.Button value="none">Sin icono</Radio.Button>
                        <Radio.Button value="predefined">Icono predefinido</Radio.Button>
                    </Radio.Group>

                    {iconType === 'predefined' && (
                        <Form.Item name="icon" noStyle>
                            <Select
                                size="large"
                                placeholder="Selecciona un icono"
                                showSearch
                                optionFilterProp="label"
                            >
                                {PREDEFINED_ICONS.map(icon => (
                                    <Select.Option key={icon.value} value={icon.value} label={icon.label}>
                                        <Space>
                                            {icon.icon}
                                            <span>{icon.label}</span>
                                        </Space>
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                </Form.Item>

                <Form.Item
                    label={<span style={{ fontSize: 14, fontWeight: 500 }}>Orden</span>}
                    name="order"
                    rules={[{ required: true, message: 'Por favor ingrese el orden' }]}
                    tooltip="Usa el drag & drop en el árbol para reordenar fácilmente"
                >
                    <Input size="large" type="number" placeholder="0, 1, 2..." />
                </Form.Item>

                <Form.Item
                    label={<span style={{ fontSize: 14, fontWeight: 500 }}>Enlace externo</span>}
                    name="external"
                    valuePropName="checked"
                    tooltip="Marcar si el enlace abre en una nueva pestaña"
                >
                    <Switch />
                </Form.Item>

                <Form.Item
                    label={<span style={{ fontSize: 14, fontWeight: 500 }}>Estado de visibilidad</span>}
                    name="status"
                    tooltip="Define cómo se muestra este item en el portal público"
                >
                    <Radio.Group>
                        <Space orientation="vertical">
                            <Radio value="visible">
                                <Space>
                                    <Tag icon={<EyeOutlined />} color="green">Visible</Tag>
                                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>Se muestra en el menú del portal</span>
                                </Space>
                            </Radio>
                            <Radio value="hidden">
                                <Space>
                                    <Tag icon={<EyeInvisibleOutlined />} color="red">Oculto</Tag>
                                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>No aparece en el menú público</span>
                                </Space>
                            </Radio>
                            <Radio value="disabled">
                                <Space>
                                    <Tag icon={<StopOutlined />} color="default">Deshabilitado</Tag>
                                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>Temporalmente no disponible</span>
                                </Space>
                            </Radio>
                        </Space>
                    </Radio.Group>
                </Form.Item>

                {selectedParent && (
                    <Form.Item name="parentId" hidden>
                        <Input />
                    </Form.Item>
                )}

                {!selectedParent && !editingItem && (
                    <Alert
                        message="Item de nivel superior"
                        description="Este item se agregará en el nivel superior del menú. La ruta se generará automáticamente a partir del nombre. Usa el botón 'Agregar hijo' en un item existente para crear submenús."
                        type="success"
                        showIcon
                    />
                )}
            </Form>
        </Modal>
    );
}
