import { Card, Tag, Typography, Space } from 'antd'
import { PictureOutlined } from '@ant-design/icons'

const { Text } = Typography

export default function Carousel({ slides = [], autoplay = true, interval = 5000, className = '' }) {
    if (!slides || slides.length === 0) {
        return (
            <div style={{ background: '#f0f0f0', textAlign: 'center', padding: 32 }}>
                <PictureOutlined style={{ fontSize: 32, color: '#bbb' }} />
                <div style={{ marginTop: 8, color: '#999', fontSize: 13 }}>Sin slides configurados</div>
            </div>
        )
    }

    return (
        <div style={{ background: '#1e293b', padding: 16 }}>
            <Space wrap style={{ marginBottom: 12 }}>
                <Tag color="blue">{slides.length} slide{slides.length !== 1 ? 's' : ''}</Tag>
                {autoplay && <Tag color="green">Autoplay {interval / 1000}s</Tag>}
                {className && <Tag color="orange">className: {className}</Tag>}
            </Space>

            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                {slides.map((slide, i) => (
                    <Card
                        key={i}
                        size="small"
                        style={{ minWidth: 200, maxWidth: 220, flexShrink: 0, background: '#0f172a', border: '1px solid #334155' }}
                    >
                        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                            {slide.backgroundImage ? (
                                <img
                                    src={slide.backgroundImage}
                                    alt=""
                                    style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 4 }}
                                    onError={(e) => { e.target.style.display = 'none' }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: 70, background: '#334155', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <PictureOutlined style={{ color: '#64748b', fontSize: 20 }} />
                                </div>
                            )}
                            <Text strong style={{ color: '#f1f5f9', fontSize: 12 }}>
                                {i + 1}. {slide.title || '(sin título)'}
                            </Text>
                            {slide.description && (
                                <Text style={{ color: '#94a3b8', fontSize: 11 }} ellipsis={{ rows: 2 }}>
                                    {slide.description}
                                </Text>
                            )}
                            {slide.buttonText && (
                                <Text style={{ color: '#60a5fa', fontSize: 11 }}>→ {slide.buttonText}</Text>
                            )}
                        </Space>
                    </Card>
                ))}
            </div>
        </div>
    )
}
