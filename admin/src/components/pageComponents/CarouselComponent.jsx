import { useState, useEffect } from 'react';
import { Card, Button, Space, Switch, Modal, Form, Input, List, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export default function CarouselComponent({
    slides = [],
    autoplay = true,
    interval = 5000,
    showDots = true,
    showArrows = true,
    editable,
    onChange
}) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [editingSlide, setEditingSlide] = useState(null);
    const [slideModalVisible, setSlideModalVisible] = useState(false);

    useEffect(() => {
        if (!autoplay || editable || slides.length === 0) return;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, interval);

        return () => clearInterval(timer);
    }, [autoplay, interval, slides.length, editable]);

    const handleAddSlide = (values) => {
        const newSlides = [...slides, { ...values, date: new Date().toISOString() }];
        onChange({ slides: newSlides });
        setSlideModalVisible(false);
    };

    const handleEditSlide = (values) => {
        const newSlides = slides.map((slide, idx) =>
            idx === editingSlide ? { ...values, date: slide.date } : slide
        );
        onChange({ slides: newSlides });
        setSlideModalVisible(false);
        setEditingSlide(null);
    };

    const handleDeleteSlide = (index) => {
        const newSlides = slides.filter((_, idx) => idx !== index);
        onChange({ slides: newSlides });
        if (currentSlide >= newSlides.length) {
            setCurrentSlide(Math.max(0, newSlides.length - 1));
        }
    };

    const openSlideModal = (index = null) => {
        setEditingSlide(index);
        setSlideModalVisible(true);
    };

    const goToSlide = (index) => {
        setCurrentSlide(index);
    };

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    if (editable) {
        return (
            <Card title="Configuración Carrusel" size="small">
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <Space wrap>
                        <Switch
                            checked={autoplay}
                            onChange={(checked) => onChange({ autoplay: checked })}
                        />
                        <span>Reproducción automática</span>
                    </Space>

                    {autoplay && (
                        <Space>
                            <span>Intervalo (ms):</span>
                            <InputNumber
                                min={1000}
                                max={10000}
                                step={1000}
                                value={interval}
                                onChange={(value) => onChange({ interval: value })}
                            />
                        </Space>
                    )}

                    <Space wrap>
                        <Switch
                            checked={showDots}
                            onChange={(checked) => onChange({ showDots: checked })}
                        />
                        <span>Mostrar indicadores</span>
                    </Space>

                    <Space wrap>
                        <Switch
                            checked={showArrows}
                            onChange={(checked) => onChange({ showArrows: checked })}
                        />
                        <span>Mostrar flechas</span>
                    </Space>

                    <div>
                        <Space style={{ marginBottom: 8 }}>
                            <strong>Slides</strong>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                size="small"
                                onClick={() => openSlideModal()}
                            >
                                Agregar Slide
                            </Button>
                        </Space>
                        <List
                            size="small"
                            dataSource={slides}
                            renderItem={(slide, index) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="edit"
                                            type="text"
                                            icon={<EditOutlined />}
                                            size="small"
                                            onClick={() => openSlideModal(index)}
                                        />,
                                        <Button
                                            key="delete"
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            size="small"
                                            onClick={() => handleDeleteSlide(index)}
                                        />
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={`${slide.icon} ${slide.title}`}
                                        description={slide.category}
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                </Space>

                <SlideModal
                    visible={slideModalVisible}
                    onCancel={() => {
                        setSlideModalVisible(false);
                        setEditingSlide(null);
                    }}
                    onSubmit={editingSlide !== null ? handleEditSlide : handleAddSlide}
                    initialValues={editingSlide !== null ? slides[editingSlide] : null}
                />
            </Card>
        );
    }

    if (slides.length === 0) {
        return (
            <div className="bg-gray-100 p-12 text-center rounded-lg">
                <p className="text-gray-500">No hay slides configurados</p>
            </div>
        );
    }

    const slide = slides[currentSlide];

    return (
        <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-12 min-h-[300px] flex flex-col justify-center">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="text-6xl mb-4">{slide.icon}</div>
                    <div className="inline-block px-4 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                        {slide.category}
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-gray-900">{slide.title}</h3>
                    <p className="text-lg text-gray-600 mb-6">{slide.description}</p>
                    <div className="text-sm text-gray-500 mb-4">
                        {new Date(slide.date).toLocaleDateString('es-MX')}
                    </div>
                    {slide.link && (
                        <a
                            href={slide.link}
                            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                        >
                            Ver más
                        </a>
                    )}
                </div>
            </div>

            {showArrows && slides.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                    >
                        <LeftOutlined className="text-xl text-gray-700" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                    >
                        <RightOutlined className="text-xl text-gray-700" />
                    </button>
                </>
            )}

            {showDots && slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`w-3 h-3 rounded-full transition-all ${
                                index === currentSlide
                                    ? 'bg-purple-600 w-8'
                                    : 'bg-gray-300 hover:bg-gray-400'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function SlideModal({ visible, onCancel, onSubmit, initialValues }) {
    const [form] = Form.useForm();

    const handleOk = () => {
        form.validateFields().then((values) => {
            onSubmit(values);
            form.resetFields();
        });
    };

    return (
        <Modal
            title={initialValues ? 'Editar Slide' : 'Agregar Slide'}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
            width={600}
        >
            <Form form={form} layout="vertical" initialValues={initialValues}>
                <Form.Item name="icon" label="Emoji/Icono" rules={[{ required: true }]}>
                    <Input placeholder="📊" />
                </Form.Item>
                <Form.Item name="category" label="Categoría" rules={[{ required: true }]}>
                    <Input placeholder="Actualización" />
                </Form.Item>
                <Form.Item name="title" label="Título" rules={[{ required: true }]}>
                    <Input placeholder="Nueva actualización" />
                </Form.Item>
                <Form.Item name="description" label="Descripción" rules={[{ required: true }]}>
                    <TextArea rows={3} placeholder="Descripción de la actualización" />
                </Form.Item>
                <Form.Item name="link" label="Enlace">
                    <Input placeholder="https://..." />
                </Form.Item>
            </Form>
        </Modal>
    );
}
