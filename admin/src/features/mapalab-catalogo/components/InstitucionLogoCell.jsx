import { useState } from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { DeleteOutlined, FileImageOutlined } from '@ant-design/icons';
import { BucketFilePicker } from '@features/acervo';
import { message } from '@shared/services/message';

const { Text } = Typography;

const BUCKET_SLUGS = ['mapalab', 'iieg'];

const InstitucionLogoCell = ({ institucion, onSave }) => {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const guardar = async (logoUrl) => {
        setSaving(true);
        try {
            await onSave(institucion.id, logoUrl);
        } catch {
            /* el padre avisa */
        } finally {
            setSaving(false);
        }
    };

    const handleSelect = (file) => {
        if (!file?.url) {
            message.error('El archivo seleccionado no tiene URL publica');
            return;
        }
        setPickerOpen(false);
        guardar(file.url);
    };

    return (
        <>
            <Space size={4}>
                {institucion.logoUrl ? (
                    <Tooltip title="Clic para cambiar el logo">
                        <Button
                            type="text"
                            size="small"
                            loading={saving}
                            onClick={() => setPickerOpen(true)}
                            style={{ height: 40, padding: 4 }}
                        >
                            <img
                                src={institucion.logoUrl}
                                alt={institucion.nombre}
                                style={{
                                    width: 32,
                                    height: 32,
                                    objectFit: 'contain',
                                    borderRadius: 4,
                                    background: '#fafafa',
                                    display: 'block',
                                }}
                            />
                        </Button>
                    </Tooltip>
                ) : (
                    <Button
                        size="small"
                        icon={<FileImageOutlined />}
                        loading={saving}
                        onClick={() => setPickerOpen(true)}
                    >
                        Logo
                    </Button>
                )}
                {institucion.logoUrl && (
                    <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        title="Quitar logo"
                        onClick={() => guardar(null)}
                    />
                )}
            </Space>

            <BucketFilePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleSelect}
                bucketSlugs={BUCKET_SLUGS}
                title={`Logo de ${institucion.nombre}`}
                uploadAccept="image/*"
            />

            {!institucion.logoUrl && !saving && (
                <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>opcional</Text>
                </div>
            )}
        </>
    );
};

export default InstitucionLogoCell;
