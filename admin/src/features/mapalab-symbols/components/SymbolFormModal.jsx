import { useEffect, useMemo, useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Segmented, Space, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import {
    createSymbol,
    updateSymbol,
    uploadImageSymbol,
} from '@features/mapalab-symbols/api/symbolsService';
import SymbolPreview from '@features/mapalab-symbols/components/SymbolPreview';
import { message } from '@shared/services/message';

const { Dragger } = Upload;
const { TextArea } = Input;

const KIND_OPTIONS = [
    { label: 'Emoji', value: 'emoji' },
    { label: 'SVG', value: 'svg' },
    { label: 'Imagen', value: 'image' },
];


export default function SymbolFormModal({ open, categoryId, symbol, onClose, onSaved }) {
    const [form] = Form.useForm();
    const [kind, setKind] = useState('emoji');
    const [file, setFile] = useState(null);
    const [previewValue, setPreviewValue] = useState('');
    const isEdit = Boolean(symbol?.id);

    useEffect(() => {
        if (!open) return;
        if (isEdit) {
            setKind(symbol.kind);
            setFile(null);
            setPreviewValue(symbol.value || '');
            form.setFieldsValue({
                value: symbol.value || '',
                name: symbol.name || '',
                sortOrder: symbol.sortOrder ?? symbol.sort_order ?? 0,
            });
        } else {
            setKind('emoji');
            setFile(null);
            setPreviewValue('');
            form.setFieldsValue({ value: '', name: '', sortOrder: 0 });
        }
    }, [open, symbol, isEdit, form]);

    const previewSymbol = useMemo(() => {
        if (kind === 'emoji') return { kind: 'emoji', value: previewValue };
        if (kind === 'svg') return { kind: 'svg', value: previewValue };
        if (kind === 'image' && isEdit) {
            return { kind: 'image', imageUrl: symbol?.imageUrl || symbol?.image_url };
        }
        if (kind === 'image' && file) {
            return { kind: 'image', imageUrl: URL.createObjectURL(file) };
        }
        return null;
    }, [kind, previewValue, file, isEdit, symbol]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (isEdit) {
                if (kind === 'image' && 'value' in values) delete values.value;
                await updateSymbol(symbol.id, {
                    name: values.name || null,
                    value: kind === 'image' ? undefined : values.value,
                    sortOrder: values.sortOrder ?? 0,
                });
                message.success('Símbolo actualizado');
            } else if (kind === 'image') {
                if (!file) {
                    message.error('Selecciona un archivo de imagen');
                    return;
                }
                await uploadImageSymbol({
                    file,
                    categoryId,
                    name: values.name,
                    sortOrder: values.sortOrder ?? 0,
                });
                message.success('Imagen subida');
            } else {
                await createSymbol({
                    categoryId,
                    kind,
                    value: values.value,
                    name: values.name || null,
                    sortOrder: values.sortOrder ?? 0,
                });
                message.success('Símbolo creado');
            }
            form.resetFields();
            setFile(null);
            onSaved?.();
            onClose?.();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.detail || 'Error al guardar símbolo');
        }
    };

    const draggerProps = {
        beforeUpload: (selected) => {
            setFile(selected);
            return false;
        },
        onRemove: () => {
            setFile(null);
            return true;
        },
        maxCount: 1,
        accept: '.png,.jpg,.jpeg,.svg,.webp,.gif',
        fileList: file ? [{ uid: '-1', name: file.name, status: 'done' }] : [],
    };

    return (
        <Modal
            open={open}
            title={isEdit ? `Editar símbolo` : 'Nuevo símbolo'}
            onCancel={onClose}
            onOk={handleOk}
            okText={isEdit ? 'Guardar' : 'Crear'}
            cancelText="Cancelar"
            width={560}
            destroyOnHidden
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {!isEdit && (
                    <Segmented
                        block
                        options={KIND_OPTIONS}
                        value={kind}
                        onChange={(v) => { setKind(v); setPreviewValue(''); setFile(null); }}
                    />
                )}
                {isEdit && (
                    <Alert
                        type="info"
                        showIcon
                        message={`Tipo: ${kind}`}
                        description={
                            kind === 'image'
                                ? 'Para reemplazar la imagen, borra este símbolo y crea uno nuevo.'
                                : null
                        }
                    />
                )}

                <Form form={form} layout="vertical">
                    {kind === 'emoji' && (
                        <Form.Item
                            name="value"
                            label="Carácter emoji"
                            rules={[{ required: true, message: 'Requerido' }]}
                        >
                            <Input
                                onChange={(e) => setPreviewValue(e.target.value)}
                                placeholder="😀"
                                maxLength={8}
                                style={{ fontSize: 24 }}
                            />
                        </Form.Item>
                    )}

                    {kind === 'svg' && (
                        <Form.Item
                            name="value"
                            label="SVG (XML inline)"
                            rules={[
                                { required: true, message: 'Requerido' },
                                {
                                    validator: (_, v) =>
                                        !v || /<svg/i.test(v)
                                            ? Promise.resolve()
                                            : Promise.reject(new Error('Debe contener una etiqueta <svg>')),
                                },
                            ]}
                        >
                            <TextArea
                                onChange={(e) => setPreviewValue(e.target.value)}
                                placeholder='<svg viewBox="0 0 24 24">…</svg>'
                                autoSize={{ minRows: 4, maxRows: 10 }}
                                style={{ fontFamily: 'monospace', fontSize: 12 }}
                            />
                        </Form.Item>
                    )}

                    {kind === 'image' && !isEdit && (
                        <Form.Item label="Archivo de imagen" required>
                            <Dragger {...draggerProps} style={{ padding: 8 }}>
                                <p style={{ marginBottom: 8 }}><InboxOutlined style={{ fontSize: 28 }} /></p>
                                <p>Click o arrastra el archivo</p>
                                <p style={{ fontSize: 11, color: '#888' }}>
                                    PNG, JPG, SVG, WebP, GIF · máx 5 MB
                                </p>
                            </Dragger>
                        </Form.Item>
                    )}

                    <Form.Item name="name" label="Nombre (opcional)">
                        <Input placeholder="Ej. Cara feliz" maxLength={200} />
                    </Form.Item>
                    <Form.Item name="sortOrder" label="Orden">
                        <InputNumber min={0} max={9999} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>

                {previewSymbol && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fafafa',
                            border: '1px dashed #d9d9d9',
                            borderRadius: 6,
                            padding: 16,
                            minHeight: 80,
                        }}
                    >
                        <SymbolPreview symbol={previewSymbol} size={56} />
                    </div>
                )}
            </Space>
        </Modal>
    );
}
