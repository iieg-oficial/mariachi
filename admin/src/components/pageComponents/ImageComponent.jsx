import { useState } from 'react';
import { Input, Button, Space } from 'antd';
import { PictureOutlined, LinkOutlined } from '@ant-design/icons';
import FilePicker from '@components/FilePicker';

export default function ImageComponent({ src, alt, width, height, editable, onChange }) {
    const [filePickerVisible, setFilePickerVisible] = useState(false);

    const handleFileSelect = (file) => {
        onChange({
            src: file.url,
            alt: file.metadata?.alt || file.originalName || alt
        });
        setFilePickerVisible(false);
    };

    if (editable) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        placeholder="URL de la imagen"
                        value={src}
                        onChange={(e) => onChange({ src: e.target.value })}
                        prefix={<LinkOutlined />}
                    />
                    <Button
                        type="primary"
                        icon={<PictureOutlined />}
                        onClick={() => setFilePickerVisible(true)}
                    >
                        Galería
                    </Button>
                </Space.Compact>
                <Input
                    placeholder="Texto alternativo"
                    value={alt}
                    onChange={(e) => onChange({ alt: e.target.value })}
                />
                {src && (
                    <img
                        src={src}
                        alt={alt}
                        style={{
                            width: width || '100%',
                            height: height || 'auto',
                            objectFit: 'cover',
                            borderRadius: 4
                        }}
                    />
                )}

                <FilePicker
                    visible={filePickerVisible}
                    onClose={() => setFilePickerVisible(false)}
                    onSelect={handleFileSelect}
                    allowedTypes={['image/*']}
                    title="Seleccionar Imagen"
                />
            </div>
        );
    }

    if (!src) return null;

    return (
        <img
            src={src}
            alt={alt || 'Imagen'}
            style={{
                width: width || '100%',
                height: height || 'auto',
                objectFit: 'cover',
                borderRadius: 4
            }}
        />
    );
}
