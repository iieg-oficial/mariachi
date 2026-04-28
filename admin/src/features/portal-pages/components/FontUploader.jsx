import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Upload, Button, Progress } from 'antd';
import { UploadOutlined, FontSizeOutlined } from '@ant-design/icons';
import fontService from '@features/portal-pages/hooks/fontService';
import { message } from '@shared/services/message';

const { Option } = Select;

const FontUploader = ({ visible, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileList, setFileList] = useState([]);

    const handleSubmit = async (values) => {
        if (fileList.length === 0) {
            message.warning('Por favor selecciona un archivo de fuente');
            return;
        }

        const file = fileList[0];

        if (!fontService.validateFontFile(file)) {
            message.error('Tipo de archivo no válido. Solo se aceptan: .woff2, .woff, .ttf, .otf');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const metadata = {
                name: values.name,
                family: values.family,
                style: values.style,
                weight: values.weight,
            };

            await fontService.uploadFont(file, metadata, (progress) => {
                setUploadProgress(progress);
            });

            message.success('Fuente subida exitosamente');
            form.resetFields();
            setFileList([]);
            setUploadProgress(0);

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            message.error('Error al subir la fuente');
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        if (!uploading) {
            form.resetFields();
            setFileList([]);
            setUploadProgress(0);
            onCancel();
        }
    };

    const beforeUpload = (file) => {
        if (!fontService.validateFontFile(file)) {
            message.error('Tipo de archivo no válido. Solo se aceptan: .woff2, .woff, .ttf, .otf');
            return Upload.LIST_IGNORE;
        }

        const maxSize = 5 * 1024 * 1024; 
        if (file.size > maxSize) {
            message.error('El archivo es muy grande. Máximo 5MB');
            return Upload.LIST_IGNORE;
        }

        setFileList([file]);

        if (!form.getFieldValue('name')) {
            const nameWithoutExt = file.name.replace(/\.(woff2|woff|ttf|otf)$/i, '');
            form.setFieldValue('name', nameWithoutExt);
        }

        return false;
    };

    const handleRemove = () => {
        setFileList([]);
    };

    return (
        <Modal
            title={
                <span>
                    <FontSizeOutlined style={{ marginRight: 8 }} />
                    Subir Fuente Tipográfica
                </span>
            }
            open={visible}
            onCancel={handleCancel}
            onOk={() => form.submit()}
            okText="Subir Fuente"
            cancelText="Cancelar"
            confirmLoading={uploading}
            width={600}
            maskClosable={!uploading}
            closable={!uploading}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    style: 'normal',
                    weight: 400
                }}
            >
                <Form.Item
                    label="Archivo de Fuente"
                    required
                    tooltip="Formatos soportados: .woff2 (recomendado), .woff, .ttf, .otf"
                >
                    <Upload
                        beforeUpload={beforeUpload}
                        onRemove={handleRemove}
                        fileList={fileList}
                        accept=".woff2,.woff,.ttf,.otf"
                        maxCount={1}
                    >
                        <Button icon={<UploadOutlined />} block disabled={uploading}>
                            Seleccionar Archivo
                        </Button>
                    </Upload>
                    {fileList.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                            Formato: {fontService.getFontFormat(fileList[0])} •
                            Tamaño: {fontService.formatFileSize(fileList[0].size)}
                        </div>
                    )}
                </Form.Item>

                <Form.Item
                    label="Nombre Descriptivo"
                    name="name"
                    rules={[
                        { required: true, message: 'Por favor ingresa un nombre' },
                        { min: 1, max: 255, message: 'Nombre debe tener entre 1 y 255 caracteres' }
                    ]}
                    tooltip="Nombre para identificar esta fuente (ej: 'Montserrat Bold')"
                >
                    <Input
                        placeholder="Montserrat Bold"
                        disabled={uploading}
                    />
                </Form.Item>

                <Form.Item
                    label="Familia Tipográfica"
                    name="family"
                    rules={[
                        { required: true, message: 'Por favor ingresa la familia' },
                        { min: 1, max: 255, message: 'Familia debe tener entre 1 y 255 caracteres' }
                    ]}
                    tooltip="Nombre de la familia CSS (ej: 'Montserrat'). Usa el mismo nombre para todas las variantes de una fuente."
                >
                    <Input
                        placeholder="Montserrat"
                        disabled={uploading}
                    />
                </Form.Item>

                <Form.Item
                    label="Estilo"
                    name="style"
                    rules={[{ required: true, message: 'Por favor selecciona el estilo' }]}
                >
                    <Select disabled={uploading}>
                        <Option value="normal">Normal</Option>
                        <Option value="italic">Italic</Option>
                        <Option value="oblique">Oblique</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    label="Peso (Weight)"
                    name="weight"
                    rules={[
                        { required: true, message: 'Por favor ingresa el peso' },
                        { type: 'number', min: 100, max: 900, message: 'Peso debe estar entre 100 y 900' }
                    ]}
                    tooltip="100=Thin, 300=Light, 400=Normal, 500=Medium, 700=Bold, 900=Black"
                >
                    <InputNumber
                        min={100}
                        max={900}
                        step={100}
                        style={{ width: '100%' }}
                        disabled={uploading}
                    />
                </Form.Item>

                {uploading && (
                    <Form.Item>
                        <Progress percent={uploadProgress} status="active" />
                    </Form.Item>
                )}
            </Form>

            <div style={{
                marginTop: 16,
                padding: 12,
                background: '#f0f7ff',
                border: '1px solid #91d5ff',
                borderRadius: 4,
                fontSize: 12
            }}>
                <strong>💡 Consejos:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>Usa <strong>.woff2</strong> para mejor compresión y rendimiento</li>
                    <li>Sube múltiples pesos (400, 700) de la misma familia para tener variantes</li>
                    <li>Asegúrate de tener los derechos para usar la fuente</li>
                </ul>
            </div>
        </Modal>
    );
};

export default FontUploader;
