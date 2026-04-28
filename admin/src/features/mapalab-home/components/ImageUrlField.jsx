import { useEffect, useState } from 'react';
import { Button, Image, Input, Space } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import { BucketFilePicker } from '@features/media';

const MAPALAB_BUCKET_SLUG = 'mapalab';


export default function ImageUrlField({ value, onChange, disabled, placeholder = 'URL de imagen' }) {
    const [bucketId, setBucketId] = useState(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        api.get('/media-buckets')
            .then((res) => {
                if (cancelled) return;
                const bucket = res.data.find((b) => b.acervo_bucket === MAPALAB_BUCKET_SLUG);
                if (bucket) setBucketId(bucket.id);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const onSelect = (file) => {
        if (file?.url) onChange?.(file.url);
        setOpen(false);
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Space.Compact style={{ width: '100%' }}>
                <Input
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={(e) => onChange?.(e.target.value)}
                    disabled={disabled}
                />
                <Button
                    icon={<FileImageOutlined />}
                    disabled={disabled || !bucketId}
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
                bucketId={bucketId}
                title="Elegir imagen"
            />
        </Space>
    );
}
