import { useState } from 'react';
import { Button, Image, Input, Space, Typography } from 'antd';
import { ClearOutlined, FileImageOutlined } from '@ant-design/icons';
import { BucketFilePicker } from '@features/media';
import { message } from '@shared/services/message';

const { Text } = Typography;
const BUCKET_SLUGS = ['mapalab', 'iieg'];
const RECOMMENDED_PREFIX = 'eventos/';
const ALLOWED_PREFIXES = ['http://', 'https://', '/acervo/', '/', 'data:image/'];

const isValidImageUrl = (v) => {
    if (!v) return true;
    const s = String(v).trim().toLowerCase();
    return ALLOWED_PREFIXES.some((p) => s.startsWith(p));
};

export default function EventoIconPicker({ value, onChange, disabled }) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const invalid = value && !isValidImageUrl(value);

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
                    status={invalid ? 'error' : undefined}
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
                {value && (
                    <Button
                        icon={<ClearOutlined />}
                        disabled={disabled}
                        onClick={() => onChange?.(null)}
                        title="Quitar imagen"
                    />
                )}
            </Space.Compact>
            <Text type="secondary" style={{ fontSize: 12 }}>
                Convención: subir a <code>mapalab/{RECOMMENDED_PREFIX}</code>. Para iconos compartidos entre secciones del IIEG, usar <code>iieg/iconos/</code>.
            </Text>
            {invalid && (
                <span style={{ color: '#ff4d4f', fontSize: 12 }}>
                    URL no válida — debe empezar con http(s)://, /acervo/ o data:image/
                </span>
            )}
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
                bucketSlugs={BUCKET_SLUGS}
                title="Elegir imagen del evento"
                uploadAccept="image/*"
            />
        </Space>
    );
}
