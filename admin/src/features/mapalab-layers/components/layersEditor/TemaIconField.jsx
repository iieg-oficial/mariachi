import { useState } from 'react';
import { Button, Image, Input, Space } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import { BucketFilePicker } from '@features/media';
import { message } from '@shared/services/message';

const BUCKET_SLUGS = ['mapalab', 'iieg'];

export default function TemaIconField({ value, onChange, disabled }) {
    const [pickerOpen, setPickerOpen] = useState(false);

    const onSelect = (file) => {
        if (!file?.url) {
            message.error('El archivo seleccionado no tiene URL pública');
            return;
        }
        onChange?.(file.url);
        setPickerOpen(false);
    };

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Space.Compact style={{ width: '100%' }}>
                <Input
                    placeholder="https://… o ruta del bucket"
                    value={value || ''}
                    onChange={(e) => onChange?.(e.target.value)}
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
            {value && (
                <div style={{ padding: 8, border: '1px solid #f0f0f0', borderRadius: 4, background: '#fafafa', display: 'inline-block' }}>
                    <Image
                        src={value}
                        alt="Icono del tema"
                        height={48}
                        fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect fill='%23eee' width='48' height='48'/%3E%3C/svg%3E"
                    />
                </div>
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
