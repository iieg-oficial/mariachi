import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal } from 'antd';
import {
    createCategory,
    updateCategory,
} from '@features/mapalab-symbols/api/symbolsService';
import CategoryIconField from '@features/mapalab-symbols/components/CategoryIconField';
import { message } from '@shared/services/message';


function slugify(value) {
    return (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100);
}


export default function CategoryFormModal({ open, category, onClose, onSaved }) {
    const [form] = Form.useForm();
    const isEdit = Boolean(category?.id);

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                slug: category?.slug || '',
                name: category?.name || '',
                icon: category?.icon || '',
                sortOrder: category?.sortOrder ?? category?.sort_order ?? 0,
            });
        }
    }, [open, category, form]);

    const handleNameBlur = () => {
        const slug = form.getFieldValue('slug');
        const name = form.getFieldValue('name');
        if (!slug && name) {
            form.setFieldValue('slug', slugify(name));
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                slug: values.slug,
                name: values.name,
                icon: values.icon || null,
                sortOrder: values.sortOrder ?? 0,
            };
            if (isEdit) {
                await updateCategory(category.id, payload);
                message.success('Categoría actualizada');
            } else {
                await createCategory(payload);
                message.success('Categoría creada');
            }
            form.resetFields();
            onSaved?.();
            onClose?.();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.detail || 'Error al guardar categoría');
        }
    };

    return (
        <Modal
            open={open}
            title={isEdit ? `Editar categoría: ${category.name}` : 'Nueva categoría'}
            onCancel={onClose}
            onOk={handleOk}
            okText={isEdit ? 'Guardar' : 'Crear'}
            cancelText="Cancelar"
            destroyOnHidden
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="name"
                    label="Nombre visible"
                    rules={[{ required: true, message: 'Requerido' }]}
                >
                    <Input onBlur={handleNameBlur} placeholder="Ej. Caras" maxLength={200} />
                </Form.Item>
                <Form.Item
                    name="slug"
                    label="Slug"
                    rules={[
                        { required: true, message: 'Requerido' },
                        {
                            pattern: /^[a-z0-9-]+$/,
                            message: 'Solo minúsculas, números y guiones',
                        },
                    ]}
                >
                    <Input placeholder="ej. caras" maxLength={100} />
                </Form.Item>
                <Form.Item
                    name="icon"
                    label="Ícono de la pestaña (opcional)"
                    extra="Un emoji, o cualquier símbolo del catálogo (imagen o SVG)."
                >
                    <CategoryIconField />
                </Form.Item>
                <Form.Item name="sortOrder" label="Orden">
                    <InputNumber min={0} max={9999} style={{ width: '100%' }} />
                </Form.Item>
            </Form>
        </Modal>
    );
}
