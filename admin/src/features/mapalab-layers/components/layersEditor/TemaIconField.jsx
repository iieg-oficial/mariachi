import { useState } from 'react';
import { Button, Card, Image, Input, Segmented, Space, Typography } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import { BucketFilePicker } from '@features/acervo';
import { message } from '@shared/services/message';

const { Text } = Typography;

const BUCKET_SLUGS = ['mapalab', 'iieg'];

const ICON_STATES = [
    { value: 'normal', label: 'Normal' },
    { value: 'hover', label: 'Hover / Activo' },
];

export default function TemaIconField({ value, onChange, disabled }) {
    const [activeState, setActiveState] = useState('normal');
    const [pickerOpen, setPickerOpen] = useState(false);

    const overrides = value && typeof value === 'object' ? value : {};
    const currentUrl = overrides[activeState] || '';

    const onSelect = (file) => {
        if (!file?.url) {
            message.error('El archivo seleccionado no tiene URL publica');
            return;
        }
        const updated = { ...overrides, [activeState]: file.url };
        onChange?.(updated);
        setPickerOpen(false);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        const updated = { ...overrides };
        if (val) {
            updated[activeState] = val;
        } else {
            delete updated[activeState];
        }
        onChange?.(Object.keys(updated).length > 0 ? updated : undefined);
    };

    const stateLabel = ICON_STATES.find(s => s.value === activeState)?.label || activeState;

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Segmented
                options={ICON_STATES}
                value={activeState}
                onChange={setActiveState}
                block
            />
            <Card size="small" title={`Estado: ${stateLabel}`} style={{ background: '#fafafa' }}>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        placeholder="https://… o ruta del bucket"
                        value={currentUrl}
                        onChange={handleInputChange}
                        disabled={disabled}
                    />
                    <Button
                        icon={<FileImageOutlined />}
                        disabled={disabled}
                        onClick={() => setPickerOpen(true)}
                    >
                        Media
                    </Button>
                </Space.Compact>
                {currentUrl && (
                    <div style={{ marginTop: 8, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4, background: '#fff', display: 'inline-block' }}>
                        <Image
                            src={currentUrl}
                            alt={`Icono ${stateLabel}`}
                            height={48}
                            fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect fill='%23eee' width='48' height='48'/%3E%3C/svg%3E"
                        />
                    </div>
                )}
            </Card>
            {!disabled && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Define iconos distintos para el estado normal (sider colapsado) y hover/activo (sider expandido o capas activas). Deja vacio un estado para usar el icono por defecto.
                </Text>
            )}
            <BucketFilePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={onSelect}
                bucketSlugs={BUCKET_SLUGS}
                title="Elegir icono del tema"
                uploadAccept="image/*"
            />
        </Space>
    );
}
