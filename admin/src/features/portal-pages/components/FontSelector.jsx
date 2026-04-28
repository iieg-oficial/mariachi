import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Spin, Empty, Select, Space, Typography, Input } from 'antd';
import { FontSizeOutlined, PlusOutlined } from '@ant-design/icons';
import fontService from '@features/portal-pages/hooks/fontService';
import FontUploader from './FontUploader';
import { message } from '@shared/services/message';

const { Option } = Select;
const { Text } = Typography;

const FontSelector = ({
    visible,
    onCancel,
    onSelect,
    defaultFamily = null,
    title = 'Seleccionar Fuente'
}) => {
    const [loading, setLoading] = useState(false);
    const [fontFamilies, setFontFamilies] = useState([]);
    const [selectedFamily, setSelectedFamily] = useState(null);
    const [previewText, setPreviewText] = useState('El veloz murciélago hindú comía feliz cardillo y kiwi. 0123456789');
    const [uploaderVisible, setUploaderVisible] = useState(false);

    const loadFonts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fontService.getFontFamilies();
            setFontFamilies(data);

            data.forEach(familyData => {
                fontService.loadFontFamily(familyData.variants);
            });
        } catch (error) {
            message.error('Error al cargar fuentes');
            console.error('Error loading fonts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            loadFonts();
            setSelectedFamily(defaultFamily);
        }
    }, [visible, defaultFamily, loadFonts]);

    const handleSelectFamily = (family) => {
        setSelectedFamily(family);
    };

    const handleConfirm = () => {
        if (selectedFamily) {
            onSelect(selectedFamily);
            onCancel();
        } else {
            message.warning('Por favor selecciona una fuente');
        }
    };

    const handleUploadSuccess = () => {
        setUploaderVisible(false);
        loadFonts();
    };

    const getCurrentFamilyData = () => {
        return fontFamilies.find(f => f.family === selectedFamily);
    };

    return (
        <>
            <Modal
                title={
                    <Space>
                        <FontSizeOutlined />
                        {title}
                    </Space>
                }
                open={visible}
                onCancel={onCancel}
                onOk={handleConfirm}
                okText="Seleccionar"
                cancelText="Cancelar"
                width={800}
                okButtonProps={{ disabled: !selectedFamily }}
            >
                <Space orientation="vertical" style={{ width: '100%' }} size="large">
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Select
                            placeholder="Selecciona una familia tipográfica"
                            style={{ width: 300 }}
                            onChange={handleSelectFamily}
                            value={selectedFamily}
                            showSearch
                            optionFilterProp="children"
                            loading={loading}
                        >
                            {fontFamilies.map(familyData => (
                                <Option key={familyData.family} value={familyData.family}>
                                    {familyData.family} ({familyData.variants.length} variante{familyData.variants.length !== 1 ? 's' : ''})
                                </Option>
                            ))}
                        </Select>

                        <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => setUploaderVisible(true)}
                        >
                            Subir Nueva Fuente
                        </Button>
                    </Space>

                    <Spin spinning={loading}>
                        {fontFamilies.length === 0 && !loading ? (
                            <Empty
                                description="No hay fuentes disponibles"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                style={{ padding: '40px 0' }}
                            >
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => setUploaderVisible(true)}
                                >
                                    Subir Primera Fuente
                                </Button>
                            </Empty>
                        ) : selectedFamily ? (
                            <div>
                                <div style={{
                                    padding: 24,
                                    background: '#fafafa',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: 4
                                }}>
                                    <Text strong style={{ display: 'block', marginBottom: 12 }}>
                                        Vista previa con todas las variantes:
                                    </Text>

                                    {getCurrentFamilyData()?.variants.map((variant) => {
                                        const fontFaceStyle = `
                                            @font-face {
                                                font-family: '${variant.family}';
                                                src: url('${variant.url}') format('${variant.format}');
                                                font-weight: ${variant.weight};
                                                font-style: ${variant.style};
                                                font-display: swap;
                                            }
                                        `;

                                        return (
                                            <div key={variant.id} style={{
                                                marginBottom: 16,
                                                padding: 16,
                                                background: '#ffffff',
                                                borderRadius: 4,
                                                border: '1px solid #e8e8e8'
                                            }}>
                                                <style>{fontFaceStyle}</style>
                                                <div style={{
                                                    fontFamily: `'${variant.family}', sans-serif`,
                                                    fontWeight: variant.weight,
                                                    fontStyle: variant.style,
                                                    fontSize: 20,
                                                    lineHeight: 1.6,
                                                    marginBottom: 8,
                                                    wordBreak: 'break-word'
                                                }}>
                                                    {previewText}
                                                </div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {variant.name} (weight: {variant.weight}, style: {variant.style})
                                                </Text>
                                            </div>
                                        );
                                    })}

                                    <div style={{ marginTop: 16 }}>
                                        <Input.TextArea
                                            placeholder="Edita el texto de preview..."
                                            value={previewText}
                                            onChange={(e) => setPreviewText(e.target.value)}
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            style={{ fontSize: 12 }}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: 16,
                                    padding: 12,
                                    background: '#f0f7ff',
                                    border: '1px solid #91d5ff',
                                    borderRadius: 4,
                                    fontSize: 12
                                }}>
                                    <strong>Familia seleccionada:</strong> {selectedFamily}
                                    <br />
                                    <strong>Variantes disponibles:</strong> {getCurrentFamilyData()?.variants.length || 0} variante{getCurrentFamilyData()?.variants.length !== 1 ? 's' : ''}
                                    <br />
                                    <strong>Uso en CSS:</strong> <code>font-family: '{selectedFamily}', sans-serif;</code>
                                </div>
                            </div>
                        ) : (
                            <Empty
                                description="Selecciona una familia tipográfica para ver el preview"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                style={{ padding: '40px 0' }}
                            />
                        )}
                    </Spin>
                </Space>
            </Modal>

            <FontUploader
                visible={uploaderVisible}
                onCancel={() => setUploaderVisible(false)}
                onSuccess={handleUploadSuccess}
            />
        </>
    );
};

export default FontSelector;
