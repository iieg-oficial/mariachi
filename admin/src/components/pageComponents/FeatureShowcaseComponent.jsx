import { useState } from 'react';
import { Card, Input, Button, Space, Switch, Modal, Form, List, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export default function FeatureShowcaseComponent({
    title,
    description,
    features = [],
    ctaButtons = [],
    visualContent = {},
    statistics = [],
    layout = 'two-column',
    editable,
    onChange
}) {
    const [editingButton, setEditingButton] = useState(null);
    const [editingStat, setEditingStat] = useState(null);
    const [buttonModalVisible, setButtonModalVisible] = useState(false);
    const [statModalVisible, setStatModalVisible] = useState(false);
    const [featureInput, setFeatureInput] = useState('');

    const handleAddButton = (values) => {
        const newButtons = [...ctaButtons, values];
        onChange({ ctaButtons: newButtons });
        setButtonModalVisible(false);
    };

    const handleEditButton = (values) => {
        const newButtons = ctaButtons.map((btn, idx) =>
            idx === editingButton ? values : btn
        );
        onChange({ ctaButtons: newButtons });
        setButtonModalVisible(false);
        setEditingButton(null);
    };

    const handleDeleteButton = (index) => {
        const newButtons = ctaButtons.filter((_, idx) => idx !== index);
        onChange({ ctaButtons: newButtons });
    };

    const handleAddStat = (values) => {
        const newStats = [...statistics, values];
        onChange({ statistics: newStats });
        setStatModalVisible(false);
    };

    const handleEditStat = (values) => {
        const newStats = statistics.map((stat, idx) =>
            idx === editingStat ? values : stat
        );
        onChange({ statistics: newStats });
        setStatModalVisible(false);
        setEditingStat(null);
    };

    const handleDeleteStat = (index) => {
        const newStats = statistics.filter((_, idx) => idx !== index);
        onChange({ statistics: newStats });
    };

    const addFeature = () => {
        if (featureInput.trim()) {
            const newFeatures = [...features, featureInput.trim()];
            onChange({ features: newFeatures });
            setFeatureInput('');
        }
    };

    const removeFeature = (index) => {
        const newFeatures = features.filter((_, idx) => idx !== index);
        onChange({ features: newFeatures });
    };

    const openButtonModal = (index = null) => {
        setEditingButton(index);
        setButtonModalVisible(true);
    };

    const openStatModal = (index = null) => {
        setEditingStat(index);
        setStatModalVisible(true);
    };

    if (editable) {
        return (
            <Card title="Configuración Showcase" size="small">
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <Input
                        placeholder="Título"
                        value={title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        size="large"
                    />

                    <TextArea
                        placeholder="Descripción"
                        value={description}
                        onChange={(e) => onChange({ description: e.target.value })}
                        rows={3}
                    />

                    <Space>
                        <span>Diseño:</span>
                        <Select
                            value={layout}
                            onChange={(value) => onChange({ layout: value })}
                            style={{ width: 150 }}
                        >
                            <Select.Option value="two-column">Dos columnas</Select.Option>
                            <Select.Option value="centered">Centrado</Select.Option>
                        </Select>
                    </Space>

                    <div>
                        <strong>Características</strong>
                        <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                            <Input
                                placeholder="Agregar característica"
                                value={featureInput}
                                onChange={(e) => setFeatureInput(e.target.value)}
                                onPressEnter={addFeature}
                            />
                            <Button type="primary" onClick={addFeature}>
                                Agregar
                            </Button>
                        </Space.Compact>
                        <List
                            size="small"
                            dataSource={features}
                            renderItem={(feature, index) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="delete"
                                            type="text"
                                            danger
                                            size="small"
                                            onClick={() => removeFeature(index)}
                                        >
                                            Eliminar
                                        </Button>
                                    ]}
                                >
                                    {feature}
                                </List.Item>
                            )}
                        />
                    </div>

                    <div>
                        <strong>Contenido Visual</strong>
                        <Space orientation="vertical" style={{ width: '100%', marginTop: 8 }}>
                            <Select
                                value={visualContent?.type}
                                onChange={(value) =>
                                    onChange({ visualContent: { ...visualContent, type: value } })
                                }
                                style={{ width: '100%' }}
                            >
                                <Select.Option value="image">Imagen</Select.Option>
                                <Select.Option value="video">Video</Select.Option>
                                <Select.Option value="none">Ninguno</Select.Option>
                            </Select>
                            {visualContent?.type !== 'none' && (
                                <Input
                                    placeholder="URL del contenido"
                                    value={visualContent?.src}
                                    onChange={(e) =>
                                        onChange({ visualContent: { ...visualContent, src: e.target.value } })
                                    }
                                />
                            )}
                        </Space>
                    </div>

                    <div>
                        <Space style={{ marginBottom: 8 }}>
                            <strong>Botones CTA</strong>
                            <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                size="small"
                                onClick={() => openButtonModal()}
                            >
                                Agregar
                            </Button>
                        </Space>
                        <List
                            size="small"
                            dataSource={ctaButtons}
                            renderItem={(btn, index) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="edit"
                                            type="text"
                                            icon={<EditOutlined />}
                                            size="small"
                                            onClick={() => openButtonModal(index)}
                                        />,
                                        <Button
                                            key="delete"
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            size="small"
                                            onClick={() => handleDeleteButton(index)}
                                        />
                                    ]}
                                >
                                    {btn.text} ({btn.type})
                                </List.Item>
                            )}
                        />
                    </div>

                    <div>
                        <Space style={{ marginBottom: 8 }}>
                            <strong>Estadísticas</strong>
                            <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                size="small"
                                onClick={() => openStatModal()}
                            >
                                Agregar
                            </Button>
                        </Space>
                        <List
                            size="small"
                            dataSource={statistics}
                            renderItem={(stat, index) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="edit"
                                            type="text"
                                            icon={<EditOutlined />}
                                            size="small"
                                            onClick={() => openStatModal(index)}
                                        />,
                                        <Button
                                            key="delete"
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            size="small"
                                            onClick={() => handleDeleteStat(index)}
                                        />
                                    ]}
                                >
                                    {stat.label}: {stat.value}
                                </List.Item>
                            )}
                        />
                    </div>
                </Space>

                <ButtonModal
                    visible={buttonModalVisible}
                    onCancel={() => {
                        setButtonModalVisible(false);
                        setEditingButton(null);
                    }}
                    onSubmit={editingButton !== null ? handleEditButton : handleAddButton}
                    initialValues={editingButton !== null ? ctaButtons[editingButton] : null}
                />

                <StatModal
                    visible={statModalVisible}
                    onCancel={() => {
                        setStatModalVisible(false);
                        setEditingStat(null);
                    }}
                    onSubmit={editingStat !== null ? handleEditStat : handleAddStat}
                    initialValues={editingStat !== null ? statistics[editingStat] : null}
                />
            </Card>
        );
    }

    const isTwoColumn = layout === 'two-column';

    return (
        <div className="py-12">
            <div className={`${isTwoColumn ? 'grid md:grid-cols-2 gap-12 items-center' : 'max-w-4xl mx-auto text-center'}`}>
                <div className={isTwoColumn ? '' : 'mb-8'}>
                    {title && (
                        <h2 className="text-3xl font-bold mb-4 text-gray-900">{title}</h2>
                    )}
                    {description && (
                        <p className="text-lg text-gray-600 mb-6">{description}</p>
                    )}

                    {features.length > 0 && (
                        <div className="mb-6 space-y-3">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <CheckOutlined className="text-green-600 mt-1 text-xl" />
                                    <span className="text-gray-700">{feature}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {ctaButtons.length > 0 && (
                        <div className={`flex gap-4 mb-6 ${!isTwoColumn ? 'justify-center' : ''}`}>
                            {ctaButtons.map((btn, index) => (
                                <a
                                    key={index}
                                    href={btn.link}
                                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                                        btn.type === 'primary'
                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                            : 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50'
                                    }`}
                                >
                                    {btn.text}
                                </a>
                            ))}
                        </div>
                    )}

                    {statistics.length > 0 && (
                        <div className={`grid grid-cols-${Math.min(statistics.length, 3)} gap-4 pt-6 border-t border-gray-200`}>
                            {statistics.map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">{stat.value}</div>
                                    <div className="text-sm text-gray-600">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {visualContent?.type === 'image' && visualContent?.src && (
                    <div className={`${isTwoColumn ? '' : 'max-w-2xl mx-auto'}`}>
                        <img
                            src={visualContent.src}
                            alt={title}
                            className="w-full h-auto rounded-lg shadow-lg"
                        />
                    </div>
                )}

                {visualContent?.type === 'video' && visualContent?.src && (
                    <div className={`${isTwoColumn ? '' : 'max-w-2xl mx-auto'}`}>
                        <div className="relative pb-[56.25%] rounded-lg overflow-hidden shadow-lg">
                            <iframe
                                src={visualContent.src}
                                className="absolute top-0 left-0 w-full h-full"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ButtonModal({ visible, onCancel, onSubmit, initialValues }) {
    const [form] = Form.useForm();

    const handleOk = () => {
        form.validateFields().then((values) => {
            onSubmit(values);
            form.resetFields();
        });
    };

    return (
        <Modal
            title={initialValues ? 'Editar Botón' : 'Agregar Botón'}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
        >
            <Form form={form} layout="vertical" initialValues={initialValues}>
                <Form.Item name="text" label="Texto" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="link" label="Enlace" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
                    <Select>
                        <Select.Option value="primary">Primario</Select.Option>
                        <Select.Option value="secondary">Secundario</Select.Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
}

function StatModal({ visible, onCancel, onSubmit, initialValues }) {
    const [form] = Form.useForm();

    const handleOk = () => {
        form.validateFields().then((values) => {
            onSubmit(values);
            form.resetFields();
        });
    };

    return (
        <Modal
            title={initialValues ? 'Editar Estadística' : 'Agregar Estadística'}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
        >
            <Form form={form} layout="vertical" initialValues={initialValues}>
                <Form.Item name="value" label="Valor" rules={[{ required: true }]}>
                    <Input placeholder="100+" />
                </Form.Item>
                <Form.Item name="label" label="Etiqueta" rules={[{ required: true }]}>
                    <Input placeholder="Municipios" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
