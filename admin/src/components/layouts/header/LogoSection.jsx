import { useState, useEffect } from 'react';
import { Form, Button, Space, Image } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import MediaSelector from '@components/MediaSelector';

const LogoSection = ({ form }) => {
    const [mediaSelectorVisible, setMediaSelectorVisible] = useState(false);
    const [selectedLogo, setSelectedLogo] = useState(form.getFieldValue('logoUrl'));

    useEffect(() => {
        const logoUrl = form.getFieldValue('logoUrl');
        if (logoUrl) {
            setSelectedLogo(logoUrl);
        }
    }, [form]);

    const handleLogoSelect = (file) => {
        setSelectedLogo(file.url);
        form.setFieldValue('logoUrl', file.url);
        setMediaSelectorVisible(false);
    };

    return (
        <>
            <Form.Item
                label="Logo"
                name="logoUrl"
            >
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Button
                        icon={<FileImageOutlined />}
                        onClick={() => setMediaSelectorVisible(true)}
                        block
                    >
                        Seleccionar Logo desde Media
                    </Button>
                    {selectedLogo && (
                        <div style={{
                            padding: 12,
                            border: '1px solid #d9d9d9',
                            borderRadius: 4,
                            background: '#fafafa'
                        }}>
                            <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                                <Image
                                    src={selectedLogo}
                                    alt="Logo seleccionado"
                                    style={{ maxHeight: 100, maxWidth: 200, objectFit: 'contain' }}
                                />
                                <small style={{ color: '#8c8c8c', wordBreak: 'break-all' }}>
                                    {selectedLogo}
                                </small>
                            </Space>
                        </div>
                    )}
                </Space>
            </Form.Item>

            <MediaSelector
                visible={mediaSelectorVisible}
                onCancel={() => setMediaSelectorVisible(false)}
                onSelect={handleLogoSelect}
                defaultFolder="logotipos"
                fileType="image"
                title="Seleccionar Logo"
            />
        </>
    );
};

export default LogoSection;
