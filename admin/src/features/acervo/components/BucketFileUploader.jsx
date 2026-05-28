import { useState } from 'react';
import { Modal, Upload, Select, Form, Button, Space, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { uploadAcervoFile } from '@features/acervo/api/acervoService';
import { message } from '@shared/services/message';

const { Dragger } = Upload;
const { Text } = Typography;

export default function BucketFileUploader({
    open,
    onClose,
    onUploaded,
    bucketId,
    prefixes = [''],
    title = 'Subir archivo nuevo',
    accept,
}) {
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fileList, setFileList] = useState([]);

    const handleClose = () => {
        setFileList([]);
        setProgress(0);
        form.resetFields();
        onClose();
    };

    const handleUpload = async () => {
        const values = await form.validateFields();
        const file = fileList[0]?.originFileObj;
        if (!file) {
            message.warning('Selecciona un archivo');
            return;
        }
        setUploading(true);
        try {
            const result = await uploadAcervoFile(file, {
                bucketId,
                folder: values.folder || undefined,
                onProgress: setProgress,
            });
            message.success(`Archivo "${file.name}" subido`);
            // Guardar path relativo (portable entre entornos), no la URL absoluta de MinIO local.
            // result.name viene del backend como "metadata/txt/uuid.csv" (object key dentro del bucket).
            const objectKey = result?.name || (() => {
                const folderPath = values.folder ? values.folder.replace(/\/?$/, '/') : '';
                return `${folderPath}${file.name}`;
            })();
            const enlace = objectKey.startsWith('/') ? objectKey : `/${objectKey}`;
            onUploaded?.({
                nombre: file.name,
                enlace,
                url: result?.url,
            });
            handleClose();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al subir el archivo');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <Modal
            title={title}
            open={open}
            onCancel={handleClose}
            footer={[
                <Button key="cancel" onClick={handleClose} disabled={uploading}>Cancelar</Button>,
                <Button
                    key="ok"
                    type="primary"
                    onClick={handleUpload}
                    loading={uploading}
                    disabled={!fileList.length || !bucketId}
                >
                    {uploading ? `Subiendo ${progress}%` : 'Subir'}
                </Button>,
            ]}
            width="80%"
            style={{ maxWidth: 600 }}
            destroyOnHidden
        >
            <Form form={form} layout="vertical" initialValues={{ folder: prefixes[0] || '' }}>
                {prefixes.length > 1 && (
                    <Form.Item label="Carpeta destino" name="folder">
                        <Select
                            options={prefixes.map((p) => ({
                                value: p,
                                label: p ? p.replace(/\/$/, '') : 'Raíz',
                            }))}
                        />
                    </Form.Item>
                )}
                <Form.Item label="Archivo">
                    <Dragger
                        accept={accept}
                        multiple={false}
                        maxCount={1}
                        beforeUpload={() => false}
                        fileList={fileList}
                        onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
                        onRemove={() => setFileList([])}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ fontSize: 32, color: '#5C2472' }} />
                        </p>
                        <p className="ant-upload-text">Click o arrastra un archivo</p>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {accept ? `Tipos aceptados: ${accept}` : 'Cualquier tipo de archivo'}
                        </Text>
                    </Dragger>
                </Form.Item>
            </Form>
        </Modal>
    );
}
