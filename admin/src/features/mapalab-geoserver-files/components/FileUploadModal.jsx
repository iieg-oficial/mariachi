import { useEffect, useState } from 'react';
import { Alert, Form, Input, Modal, Space, Tag, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { uploadGeoserverFile } from '@features/mapalab-geoserver-files/api/geoserverFilesService';
import { message } from '@shared/services/message';

const { Dragger } = Upload;

const FILE_BASENAME_RE = /^[a-zA-Z0-9._-]+\.(svg|png|jpg|jpeg|webp|gif|tiff|tif)$/i;


export default function FileUploadModal({ open, currentPath, onClose, onUploaded }) {
    const [form] = Form.useForm();
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setFile(null);
            setSubmitting(false);
            form.resetFields();
        }
    }, [open, form]);

    const draggerProps = {
        beforeUpload: (selected) => {
            setFile(selected);
            const suggested = selected.name.toLowerCase().replace(/\s+/g, '-');
            form.setFieldsValue({ basename: suggested });
            return false;
        },
        onRemove: () => {
            setFile(null);
            form.setFieldsValue({ basename: '' });
            return true;
        },
        maxCount: 1,
        accept: '.svg,.png,.jpg,.jpeg,.webp,.gif,.tiff,.tif',
        fileList: file ? [{ uid: '-1', name: file.name, status: 'done' }] : [],
    };

    const handleOk = async () => {
        if (!file) {
            message.error('Selecciona un archivo');
            return;
        }
        try {
            const values = await form.validateFields();
            const fullName = currentPath ? `${currentPath}/${values.basename}` : values.basename;
            setSubmitting(true);
            const result = await uploadGeoserverFile({ file, name: fullName });
            message.success(`Subido: ${result.name}`);
            onUploaded?.(result);
            onClose?.();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.detail || 'Error al subir archivo');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            title="Subir archivo a GeoServer"
            onCancel={onClose}
            onOk={handleOk}
            okText="Subir"
            cancelText="Cancelar"
            confirmLoading={submitting}
            width={560}
            destroyOnHidden
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Alert
                    type="info"
                    showIcon
                    closable
                    message={
                        <span>
                            Destino:{' '}
                            <Tag color="gold" style={{ marginInlineStart: 4 }}>
                                styles/{currentPath || '(raíz)'}
                            </Tag>
                        </span>
                    }
                    description="Si quieres subir a otra carpeta, cierra este modal y navega a esa carpeta primero."
                />

                <Dragger {...draggerProps} style={{ padding: 8 }}>
                    <p style={{ marginBottom: 8 }}><InboxOutlined style={{ fontSize: 28 }} /></p>
                    <p>Click o arrastra el archivo</p>
                    <p style={{ fontSize: 11, color: '#888' }}>SVG, PNG, JPG, WebP, GIF, TIFF · máx 5 MB</p>
                </Dragger>

                <Form form={form} layout="vertical">
                    <Form.Item
                        name="basename"
                        label="Nombre del archivo"
                        rules={[
                            { required: true, message: 'Requerido' },
                            {
                                pattern: FILE_BASENAME_RE,
                                message: 'Solo letras, números, guion, guion bajo y punto. Debe terminar en una extensión soportada.',
                            },
                        ]}
                    >
                        <Input placeholder="Ejemplo: hospital-tercer-nivel.svg" maxLength={120} />
                    </Form.Item>
                </Form>
            </Space>
        </Modal>
    );
}
