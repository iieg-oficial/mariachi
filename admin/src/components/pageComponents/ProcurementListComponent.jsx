import { useState } from 'react';
import { Card, Button, Space, Input, Modal, Form, List, Select, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const STATUS_STYLES = {
    active: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Activa' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cerrada' },
    awarded: { bg: 'bg-green-100', text: 'text-green-800', label: 'Adjudicada' }
};

export default function ProcurementListComponent({
    title,
    items = [],
    externalLink,
    showGuide = true,
    guideSteps = [],
    editable,
    onChange
}) {
    const [editingItem, setEditingItem] = useState(null);
    const [itemModalVisible, setItemModalVisible] = useState(false);

    const handleAddItem = (values) => {
        const newItems = [...items, { ...values, date: new Date().toISOString() }];
        onChange({ items: newItems });
        setItemModalVisible(false);
    };

    const handleEditItem = (values) => {
        const newItems = items.map((item, idx) =>
            idx === editingItem ? { ...values, date: item.date } : item
        );
        onChange({ items: newItems });
        setItemModalVisible(false);
        setEditingItem(null);
    };

    const handleDeleteItem = (index) => {
        const newItems = items.filter((_, idx) => idx !== index);
        onChange({ items: newItems });
    };

    const openItemModal = (index = null) => {
        setEditingItem(index);
        setItemModalVisible(true);
    };

    if (editable) {
        return (
            <Card title="Configuración Lista de Licitaciones" size="small">
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <Input
                        placeholder="Título de la sección"
                        value={title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        size="large"
                    />

                    <div>
                        <strong>Enlace Externo</strong>
                        <Input
                            placeholder="Texto del enlace"
                            value={externalLink?.text}
                            onChange={(e) =>
                                onChange({ externalLink: { ...externalLink, text: e.target.value } })
                            }
                            style={{ marginTop: 8 }}
                        />
                        <Input
                            placeholder="URL del enlace"
                            value={externalLink?.url}
                            onChange={(e) =>
                                onChange({ externalLink: { ...externalLink, url: e.target.value } })
                            }
                            style={{ marginTop: 8 }}
                        />
                    </div>

                    <Space wrap>
                        <Switch
                            checked={showGuide}
                            onChange={(checked) => onChange({ showGuide: checked })}
                        />
                        <span>Mostrar guía de participación</span>
                    </Space>

                    {showGuide && (
                        <TextArea
                            placeholder="Pasos de la guía (uno por línea)"
                            value={guideSteps?.join('\n')}
                            onChange={(e) =>
                                onChange({ guideSteps: e.target.value.split('\n').filter(s => s.trim()) })
                            }
                            rows={4}
                        />
                    )}

                    <div>
                        <Space style={{ marginBottom: 8 }}>
                            <strong>Licitaciones</strong>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                size="small"
                                onClick={() => openItemModal()}
                            >
                                Agregar Licitación
                            </Button>
                        </Space>
                        <List
                            size="small"
                            dataSource={items}
                            renderItem={(item, index) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="edit"
                                            type="text"
                                            icon={<EditOutlined />}
                                            size="small"
                                            onClick={() => openItemModal(index)}
                                        />,
                                        <Button
                                            key="delete"
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            size="small"
                                            onClick={() => handleDeleteItem(index)}
                                        />
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={item.title}
                                        description={`${item.number} - ${STATUS_STYLES[item.status]?.label || item.status}`}
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                </Space>

                <ItemModal
                    visible={itemModalVisible}
                    onCancel={() => {
                        setItemModalVisible(false);
                        setEditingItem(null);
                    }}
                    onSubmit={editingItem !== null ? handleEditItem : handleAddItem}
                    initialValues={editingItem !== null ? items[editingItem] : null}
                />
            </Card>
        );
    }

    return (
        <div className="py-12">
            {title && <h2 className="text-3xl font-bold mb-8 text-gray-900">{title}</h2>}

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-xl font-bold mb-4 text-gray-900">Licitaciones Recientes</h3>
                        <div className="space-y-4">
                            {items.map((item, index) => {
                                const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
                                return (
                                    <div
                                        key={index}
                                        className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-gray-900">{item.title}</h4>
                                            <span
                                                className={`px-3 py-1 ${statusStyle.bg} ${statusStyle.text} rounded-full text-xs font-medium`}
                                            >
                                                {statusStyle.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">Número: {item.number}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(item.date).toLocaleDateString('es-MX')}
                                        </p>
                                        {item.link && (
                                            <a
                                                href={item.link}
                                                className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
                                            >
                                                Ver convocatoria →
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {externalLink && externalLink.url && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <a
                                    href={externalLink.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {externalLink.text || 'Ver más licitaciones'}
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {showGuide && guideSteps.length > 0 && (
                    <div className="bg-purple-50 rounded-lg border border-purple-200 p-6">
                        <h3 className="text-lg font-bold mb-4 text-gray-900">
                            ¿Cómo participar?
                        </h3>
                        <ol className="space-y-3">
                            {guideSteps.map((step, index) => (
                                <li key={index} className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        {index + 1}
                                    </span>
                                    <span className="text-sm text-gray-700">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}

function ItemModal({ visible, onCancel, onSubmit, initialValues }) {
    const [form] = Form.useForm();

    const handleOk = () => {
        form.validateFields().then((values) => {
            onSubmit(values);
            form.resetFields();
        });
    };

    return (
        <Modal
            title={initialValues ? 'Editar Licitación' : 'Agregar Licitación'}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
            width={600}
        >
            <Form form={form} layout="vertical" initialValues={initialValues}>
                <Form.Item name="title" label="Título" rules={[{ required: true }]}>
                    <Input placeholder="Adquisición de equipo de cómputo" />
                </Form.Item>
                <Form.Item name="number" label="Número de Licitación" rules={[{ required: true }]}>
                    <Input placeholder="LP-001-2024" />
                </Form.Item>
                <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
                    <Select>
                        <Select.Option value="active">Activa</Select.Option>
                        <Select.Option value="pending">Pendiente</Select.Option>
                        <Select.Option value="closed">Cerrada</Select.Option>
                        <Select.Option value="awarded">Adjudicada</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="link" label="Enlace">
                    <Input placeholder="https://..." />
                </Form.Item>
            </Form>
        </Modal>
    );
}
