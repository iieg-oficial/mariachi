import { useState } from 'react';
import { Card, Input, Button, Space, Switch, Form, InputNumber, Modal, List } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export default function HeroBannerComponent({
    title,
    subtitle,
    backgroundGradient,
    ctaButtons = [],
    statistics = [],
    showStatistics,
    editable,
    onChange
}) {
    const [editingButton, setEditingButton] = useState(null);
    const [editingStat, setEditingStat] = useState(null);
    const [buttonModalVisible, setButtonModalVisible] = useState(false);
    const [statModalVisible, setStatModalVisible] = useState(false);

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
            <Card title="Configuración Banner Hero" size="small">
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <Input
                        placeholder="Título principal"
                        value={title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        size="large"
                    />

                    <TextArea
                        placeholder="Subtítulo o descripción"
                        value={subtitle}
                        onChange={(e) => onChange({ subtitle: e.target.value })}
                        rows={3}
                    />

                    <Input
                        placeholder="Clases de gradiente (ej: from-purple-900 to-purple-700)"
                        value={backgroundGradient}
                        onChange={(e) => onChange({ backgroundGradient: e.target.value })}
                    />

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
                            <Switch
                                checked={showStatistics}
                                onChange={(checked) => onChange({ showStatistics: checked })}
                            />
                            <strong>Mostrar estadísticas</strong>
                            {showStatistics && (
                                <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    size="small"
                                    onClick={() => openStatModal()}
                                >
                                    Agregar
                                </Button>
                            )}
                        </Space>
                        {showStatistics && (
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
                                        {stat.value} - {stat.label}
                                    </List.Item>
                                )}
                            />
                        )}
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

    return (
        <div className={`bg-gradient-to-r ${backgroundGradient} text-white py-16 px-6 rounded-lg`}>
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">{title}</h1>
                <p className="text-xl mb-8 opacity-90">{subtitle}</p>

                <div className="flex gap-4 mb-12">
                    {ctaButtons.map((btn, index) => (
                        <a
                            key={index}
                            href={btn.link}
                            className={`px-6 py-3 rounded-lg font-medium transition-all ${
                                btn.type === 'primary'
                                    ? 'bg-white text-purple-900 hover:bg-gray-100'
                                    : 'border-2 border-white text-white hover:bg-white hover:text-purple-900'
                            }`}
                        >
                            {btn.text}
                        </a>
                    ))}
                </div>

                {showStatistics && statistics.length > 0 && (
                    <div className="grid grid-cols-4 gap-8">
                        {statistics.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-3xl font-bold">{stat.value}</div>
                                <div className="text-sm opacity-80">{stat.label}</div>
                            </div>
                        ))}
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
                    <Input placeholder="primary o secondary" />
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
                    <Input placeholder="50+" />
                </Form.Item>
                <Form.Item name="label" label="Etiqueta" rules={[{ required: true }]}>
                    <Input placeholder="Sistemas" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
