import { Button, Collapse, Input, Space, Typography } from 'antd'
import { DeleteOutlined, DownOutlined, PictureOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons'

const { Text } = Typography
const { TextArea } = Input

const EMPTY_SLIDE = {
    backgroundImage: '',
    avatar: '',
    title: '',
    description: '',
    buttonText: '',
    buttonLink: ''
}

export default function CarouselEditor({ block, onChange }) {
    const slides = block?.props?.slides || []

    const updateSlides = (newSlides) => onChange({ slides: newSlides })

    const updateSlide = (index, field, value) => {
        updateSlides(slides.map((s, i) => i === index ? { ...s, [field]: value } : s))
    }

    const addSlide = () => updateSlides([...slides, { ...EMPTY_SLIDE }])

    const removeSlide = (index) => updateSlides(slides.filter((_, i) => i !== index))

    const moveSlide = (index, direction) => {
        const target = index + direction
        if (target < 0 || target >= slides.length) return
        const updated = [...slides];
        [updated[index], updated[target]] = [updated[target], updated[index]]
        updateSlides(updated)
    }

    const items = slides.map((slide, index) => ({
        key: String(index),
        label: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 8 }}>
                <Text strong style={{ fontSize: 13 }}>
                    Slide {index + 1}{slide.title ? `: ${slide.title}` : ''}
                </Text>
                <Space onClick={e => e.stopPropagation()}>
                    <Button
                        size="small"
                        icon={<UpOutlined />}
                        disabled={index === 0}
                        onClick={() => moveSlide(index, -1)}
                    />
                    <Button
                        size="small"
                        icon={<DownOutlined />}
                        disabled={index === slides.length - 1}
                        onClick={() => moveSlide(index, 1)}
                    />
                    <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={slides.length <= 1}
                        onClick={() => removeSlide(index)}
                    />
                </Space>
            </div>
        ),
        children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Imagen de Fondo (URL)</Text>
                    <Input
                        prefix={<PictureOutlined />}
                        value={slide.backgroundImage}
                        onChange={e => updateSlide(index, 'backgroundImage', e.target.value)}
                        placeholder="https://..."
                        style={{ marginTop: 4 }}
                    />
                </div>
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Avatar (URL)</Text>
                    <Input
                        prefix={<PictureOutlined />}
                        value={slide.avatar}
                        onChange={e => updateSlide(index, 'avatar', e.target.value)}
                        placeholder="https://..."
                        style={{ marginTop: 4 }}
                    />
                </div>
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Título</Text>
                    <Input
                        value={slide.title}
                        onChange={e => updateSlide(index, 'title', e.target.value)}
                        placeholder="Título del slide"
                        style={{ marginTop: 4 }}
                    />
                </div>
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Descripción</Text>
                    <TextArea
                        value={slide.description}
                        onChange={e => updateSlide(index, 'description', e.target.value)}
                        placeholder="Descripción del slide"
                        rows={3}
                        style={{ marginTop: 4 }}
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Texto del Botón</Text>
                        <Input
                            value={slide.buttonText}
                            onChange={e => updateSlide(index, 'buttonText', e.target.value)}
                            placeholder="Ver más"
                            style={{ marginTop: 4 }}
                        />
                    </div>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Enlace del Botón</Text>
                        <Input
                            value={slide.buttonLink}
                            onChange={e => updateSlide(index, 'buttonLink', e.target.value)}
                            placeholder="/pagina"
                            style={{ marginTop: 4 }}
                        />
                    </div>
                </div>
            </div>
        )
    }))

    return (
        <div style={{ background: '#fff', padding: 16, borderTop: '1px solid #f0f0f0' }}>
            {slides.length === 0
                ? <div style={{ textAlign: 'center', padding: 24, color: '#bbb' }}>Sin slides. Agrega uno para comenzar.</div>
                : <Collapse accordion items={items} />
            }
            <Button
                type="dashed"
                icon={<PlusOutlined />}
                block
                style={{ marginTop: 12 }}
                onClick={addSlide}
            >
                Agregar Slide
            </Button>
        </div>
    )
}
