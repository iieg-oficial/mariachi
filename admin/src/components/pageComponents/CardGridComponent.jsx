import { useState } from 'react';
import { Card, Button, Space, Input, InputNumber, Switch, Modal, Form, List, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const BADGE_COLORS = {
    purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
};

export default function CardGridComponent({
    title,
    cards = [],
    columns = 3,
    showCta = true,
    ctaText,
    ctaLink,
    editable,
    onChange
}) {
    const [editingCard, setEditingCard] = useState(null);
    const [cardModalVisible, setCardModalVisible] = useState(false);

    const handleAddCard = (values) => {
        const newCards = [...cards, { ...values, date: new Date().toISOString() }];
        onChange({ cards: newCards });
        setCardModalVisible(false);
    };

    const handleEditCard = (values) => {
        const newCards = cards.map((card, idx) =>
            idx === editingCard ? { ...values, date: card.date } : card
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
            <Card title="Configuración Grid de Cards" size="small">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Input
                        placeholder="Título de la sección"
                        value={title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        size="large"
                    />

                    <Space>
                        <span>Columnas:</span>
                        <InputNumber
                            min={1}
                            max={4}
                            value={columns}
                            onChange={(value) => onChange({ columns: value })}
                        />
                    </Space>

                    <Space wrap>
                        <Switch
                            checked={showCta}
                            onChange={(checked) => onChange({ showCta: checked })}
                        />
                        <span>Mostrar botón CTA</span>
                    </Space>

                    {showCta && (
                        <>
                            <Input
                                placeholder="Texto del botón CTA"
                                value={ctaText}
                                onChange={(e) => onChange({ ctaText: e.target.value })}
                            />
                            <Input
                                placeholder="Enlace del botón CTA"
                                value={ctaLink}
                                onChange={(e) => onChange({ ctaLink: e.target.value })}
                            />
                        </>
                    )}

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
                                        title={`${card.icon} ${card.title}`}
                                        description={`${card.badge} ${card.featured ? '(Destacado)' : ''}`}
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                </Space>

                <CardModal
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

    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    };

    return (
        <div className="py-12">
            {title && <h2 className="text-3xl font-bold mb-8 text-gray-900">{title}</h2>}

            <div className={`grid ${gridCols[columns]} gap-6 mb-8`}>
                {cards.map((card, index) => {
                    const colorScheme = BADGE_COLORS[card.badgeColor] || BADGE_COLORS.gray;

                    if (card.featured) {
                        return (
                            <div
                                key={index}
                                className={`bg-gradient-to-br from-${card.badgeColor}-600 to-${card.badgeColor}-700 rounded-lg p-6 text-white hover:shadow-xl transition-shadow`}
                            >
                                <div className="text-4xl mb-3">{card.icon}</div>
                                <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                                <p className="mb-4 opacity-90">{card.description}</p>
                                {card.link && (
                                    <a
                                        href={card.link}
                                        className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                    >
                                        Ver más →
                                    </a>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={index}
                            className={`bg-white rounded-lg p-6 border-2 ${colorScheme.border} hover:border-${card.badgeColor}-400 hover:shadow-lg transition-all`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="text-3xl">{card.icon}</div>
                                <span
                                    className={`px-3 py-1 ${colorScheme.bg} ${colorScheme.text} rounded-full text-xs font-medium`}
                                >
                                    {card.badge}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold mb-2 text-gray-900">{card.title}</h3>
                            <p className="text-gray-600 mb-4 text-sm">{card.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    {new Date(card.date).toLocaleDateString('es-MX')}
                                </span>
                                {card.link && (
                                    <a
                                        href={card.link}
                                        className={`text-${card.badgeColor}-600 hover:text-${card.badgeColor}-700 text-sm font-medium`}
                                    >
                                        Ver más →
                                    </a>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showCta && ctaText && ctaLink && (
                <div className="text-center">
                    <a
                        href={ctaLink}
                        className="inline-block px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                        {ctaText}
                    </a>
                </div>
            )}
        </div>
    );
}

function CardModal({ visible, onCancel, onSubmit, initialValues }) {
    const [form] = Form.useForm();

    const handleOk = () => {
        form.validateFields().then((values) => {
            onSubmit(values);
            form.resetFields();
        });
    };

    return (
        <Modal
            title={initialValues ? 'Editar Card' : 'Agregar Card'}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
            width={600}
        >
            <Form form={form} layout="vertical" initialValues={initialValues}>
                <Form.Item name="icon" label="Emoji/Icono" rules={[{ required: true }]}>
                    <Input placeholder="📊" />
                </Form.Item>
                <Form.Item name="badge" label="Badge/Etiqueta" rules={[{ required: true }]}>
                    <Input placeholder="Nuevo" />
                </Form.Item>
                <Form.Item name="badgeColor" label="Color del Badge" rules={[{ required: true }]}>
                    <Select>
                        <Select.Option value="purple">Morado</Select.Option>
                        <Select.Option value="blue">Azul</Select.Option>
                        <Select.Option value="green">Verde</Select.Option>
                        <Select.Option value="orange">Naranja</Select.Option>
                        <Select.Option value="red">Rojo</Select.Option>
                        <Select.Option value="gray">Gris</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="title" label="Título" rules={[{ required: true }]}>
                    <Input placeholder="Título del card" />
                </Form.Item>
                <Form.Item name="description" label="Descripción" rules={[{ required: true }]}>
                    <TextArea rows={3} placeholder="Descripción del contenido" />
                </Form.Item>
                <Form.Item name="link" label="Enlace">
                    <Input placeholder="https://..." />
                </Form.Item>
                <Form.Item name="featured" label="Destacado" valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
}
