import { useEffect, useState } from 'react';
import { Button, Image, Input, Space, message } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import { BucketFilePicker } from '@features/media';

const MAPALAB_BUCKET_SLUG = 'mapalab';
const ICON_PREFIXES = ['eventos/iconos/', 'iconos/', ''];


export default function EventoIconPicker({ value, onChange, disabled }) {
    const [bucketId, setBucketId] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);

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
        if (!file?.url) {
            message.error('El archivo seleccionado no tiene URL pública');
            return;
        }
        onChange?.(file.url);
        setPickerOpen(false);
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Space.Compact style={{ width: '100%' }}>
                <Input
                    placeholder="https://… o ruta del bucket"
                    value={value || ''}
                    onChange={(e) => onChange?.(e.target.value)}
                    disabled={disabled}
                />
                <Button
                    icon={<FileImageOutlined />}
                    disabled={disabled || !bucketId}
                    onClick={() => setPickerOpen(true)}
                >
                    Bucket
                </Button>
            </Space.Compact>
            {value && (
                <div style={{ padding: 8, border: '1px solid #f0f0f0', borderRadius: 4, background: '#fafafa' }}>
                    <Image
                        src={value}
                        alt="Icono del evento"
                        height={64}
                        fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%23eee' width='64' height='64'/%3E%3C/svg%3E"
                    />
                </div>
            )}
            <BucketFilePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={onSelect}
                bucketId={bucketId}
                prefixes={ICON_PREFIXES}
                title="Elegir icono del evento"
            />
        </Space>
    );
}
