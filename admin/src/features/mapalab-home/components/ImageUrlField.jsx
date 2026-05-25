import { useState } from 'react';
import { Button, Image, Input, Space } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import { BucketFilePicker } from '@features/acervo';

const BUCKET_SLUGS = ['mapalab', 'iieg'];


export default function ImageUrlField({ value, onChange, disabled, placeholder = 'URL de imagen' }) {
    const [open, setOpen] = useState(false);

    const onSelect = (file) => {
        if (file?.url) onChange?.(file.url);
        setOpen(false);
    };

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Space.Compact style={{ width: '100%' }}>
                <Input
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={(e) => onChange?.(e.target.value)}
                    disabled={disabled}
                />
                <Button
                    icon={<FileImageOutlined />}
                    disabled={disabled}
                    onClick={() => setOpen(true)}
                >
                    Media
                </Button>
            </Space.Compact>
            {value && (
                <Image
                    src={value}
                    alt="preview"
                    height={64}
                    fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%23eee' width='64' height='64'/%3E%3C/svg%3E"
                />
            )}
            <BucketFilePicker
                open={open}
                onClose={() => setOpen(false)}
                onSelect={onSelect}
                bucketSlugs={BUCKET_SLUGS}
                title="Elegir imagen"
                uploadAccept="image/*"
            />
        </Space>
    );
}
