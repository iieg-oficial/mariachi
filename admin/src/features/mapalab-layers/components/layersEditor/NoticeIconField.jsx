import { useState } from 'react';
import { Button, Image, Input, Space, Typography } from 'antd';
import { FileImageOutlined, ClearOutlined } from '@ant-design/icons';
import { BucketFilePicker } from '@features/acervo';
import { message } from '@shared/services/message';

const { Text } = Typography;
const BUCKET_SLUGS = ['iieg'];
const RECOMMENDED_PREFIX = 'iconos/';

export default function NoticeIconField({ value, onChange, disabled }) {
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
        <Space direction="vertical" style={{ width: '100%' }}>
            <Space.Compact style={{ width: '100%' }}>
                <Input
                    placeholder="https://… o ruta en bucket iieg"
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
                {value && (
                    <Button
                        icon={<ClearOutlined />}
                        disabled={disabled}
                        onClick={() => onChange?.(null)}
                        title="Quitar icono"
                    />
                )}
            </Space.Compact>
            <Text type="secondary" style={{ fontSize: 12 }}>
                Convención: subir SVGs al bucket <code>iieg/{RECOMMENDED_PREFIX}</code>.
            </Text>
            {value && (
                <div style={{ padding: 8, border: '1px solid #f0f0f0', borderRadius: 4, background: '#fafafa', display: 'inline-block' }}>
                    <Image
                        src={value}
                        alt="Icono del aviso"
                        height={40}
                        fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23eee' width='40' height='40'/%3E%3C/svg%3E"
                    />
                </div>
            )}
            <BucketFilePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={onSelect}
                bucketSlugs={BUCKET_SLUGS}
                title="Elegir icono del aviso"
                uploadAccept="image/svg+xml,image/png,image/webp"
            />
        </Space>
    );
}
