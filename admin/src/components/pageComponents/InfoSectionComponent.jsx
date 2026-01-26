import { useState } from 'react';
import { Card, Button, Space, Input, Modal, Form, List, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export default function InfoSectionComponent({
    title,
    cards = [],
    layout = 'grid',
    editable,
    onChange
}) {
    const [editingCard, setEditingCard] = useState(null);
    const [cardModalVisible, setCardModalVisible] = useState(false);

    const handleAddCard = (values) => {
        const newCards = [...cards, values];
        onChange({ cards: newCards });
        setCardModalVisible(false);
    };

    const handleEditCard = (values) => {
        const newCards = cards.map((card, idx) =>
            idx === editingCard ? values : card
        );
        onChange({ cards: newCards });
        setCardModalVisible(false);
        setEditingCard(null);
    };

    const handleDeleteCard = (index) => {
        const newCards = cards.filter((_, idx) => idx !== index);
        onChange({ cards: newCards });
    };

    const openCardModal = (index = null) => {
        setEditingCard(index);
        setCardModalVisible(true);
    };

    if (editable) {
        return (
            <Card title="Configuración Sección Informativa" size="small">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Input
                        placeholder="Título de la sección"
                        value={title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        size="large"
                    />

                    <Space>
                        <span>Diseño:</span>
                        <Select
                            value={layout}
                            onChange={(value) => onChange({ layout: value })}
                            style={{ width: 150 }}
                        >
                            <Select.Option value="grid">Grid</Select.Option>
                            <Select.Option value="list">Lista</Select.Option>
                        </Select>
                    </Space>

                    <div>
                        <Space style={{ marginBottom: 8 }}>
                            <strong>Cards</strong>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                size="small"
                                onClick={() => openCardModal()}
                            >
                                Agregar Card
                            </Button>
                        </Space>
                        <List
                            size="small"
                            dataSource={cards}
                            renderItem={(card, index) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="edit"
                                            type="text"
                                            icon={<EditOutlined />}
                                            size="small"
                                            onClick={() => openCardModal(index)}
                                        />,
                                        <Button
                                            key="delete"
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            size="small"
                                            onClick={() => handleDeleteCard(index)}
                                        />
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={card.title}
                                        description={`${card.features?.length || 0} características, ${card.links?.length || 0} enlaces`}
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                </Space>

                <InfoCardModal
                    visible={cardModalVisible}
                    onCancel={() => {
                        setCardModalVisible(false);
                        setEditingCard(null);
                    }}
                    onSubmit={editingCard !== null ? handleEditCard : handleAddCard}
                    initialValues={editingCard !== null ? cards[editingCard] : null}
                />
            </Card>
        );
    }

    const gridClass = layout === 'grid' ? 'grid md:grid-cols-2 gap-6' : 'space-y-6';

    return (
        <div className="py-12">
            {title && <h2 className="text-3xl font-bold mb-8 text-gray-900">{title}</h2>}

            <div className={gridClass}>
                {cards.map((card, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-lg border-2 border-gray-200 hover:border-purple-400 p-6 hover:shadow-lg transition-all"
                    >
                        <h3 className="text-xl font-bold mb-3 text-gray-900">{card.title}</h3>
                        {card.description && (
                            <p className="text-gray-600 mb-4">{card.description}</p>
                        )}

                        {card.features && card.features.length > 0 && (
                            <div className="mb-4 space-y-2">
                                {card.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <CheckOutlined className="text-green-600 mt-1" />
                                        <span className="text-gray-700">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {card.links && card.links.length > 0 && (
                            <div className="space-y-2">
                                {card.links.map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        className="block text-purple-600 hover:text-purple-700 hover:underline"
                                    >
                                        {link.text} →
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function InfoCardModal({ visible, onCancel, onSubmit, initialValues }) {
    const [form] = Form.useForm();
    const [features, setFeatures] = useState(initialValues?.features || []);
    const [links, setLinks] = useState(initialValues?.links || []);
    const [featureInput, setFeatureInput] = useState('');
    const [linkText, setLinkText] = useState('');
    const [linkUrl, setLinkUrl] = useState('');

    const handleOk = () => {
        form.validateFields().then((values) => {
            onSubmit({ ...values, features, links });
            form.resetFields();
            setFeatures([]);
            setLinks([]);
        });
    };

    const addFeature = () => {
        if (featureInput.trim()) {
            setFeatures([...features, featureInput.trim()]);
            setFeatureInput('');
        }
    };

    const removeFeature = (index) => {
        setFeatures(features.filter((_, idx) => idx !== index));
    };

    const addLink = () => {
        if (linkText.trim() && linkUrl.trim()) {
            setLinks([...links, { text: linkText.trim(), url: linkUrl.trim() }]);
            setLinkText('');
            setLinkUrl('');
        }
    };

    const removeLink = (index) => {
        setLinks(links.filter((_, idx) => idx !== index));
    };

    return (
        <Modal
            title={initialValues ? 'Editar Card' : 'Agregar Card'}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
            width={700}
        >
            <Form form={form} layout="vertical" initialValues={initialValues}>
                <Form.Item name="title" label="Título" rules={[{ required: true }]}>
                    <Input placeholder="Título de la sección" />
                </Form.Item>
                <Form.Item name="description" label="Descripción">
                    <TextArea rows={2} placeholder="Descripción (opcional)" />
                </Form.Item>

                <div style={{ marginBottom: 16 }}>
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
                    <strong>Enlaces</strong>
                    <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                        <Input
                            placeholder="Texto del enlace"
                            value={linkText}
                            onChange={(e) => setLinkText(e.target.value)}
                        />
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                placeholder="URL del enlace"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                            />
                            <Button type="primary" onClick={addLink}>
                                Agregar
                            </Button>
                        </Space.Compact>
                    </Space>
                    <List
                        size="small"
                        dataSource={links}
                        renderItem={(link, index) => (
                            <List.Item
                                actions={[
                                    <Button
                                        key="delete"
                                        type="text"
                                        danger
                                        size="small"
                                        onClick={() => removeLink(index)}
                                    >
                                        Eliminar
                                    </Button>
                                ]}
                            >
                                {link.text} ({link.url})
                            </List.Item>
                        )}
                    />
                </div>
            </Form>
        </Modal>
    );
}
