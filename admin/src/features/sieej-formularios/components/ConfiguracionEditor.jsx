import { useEffect } from 'react';
import { Button, DatePicker, Form, Input, Switch, Tag } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';

export default function ConfiguracionEditor({ formulario, onSaved }) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (!formulario) return;
        form.setFieldsValue({
            slug: formulario.slug,
            nombre: formulario.nombre,
            descripcion: formulario.descripcion ?? '',
            publico: formulario.publico,
            vigencia: [
                formulario.vigencia_inicio ? dayjs(formulario.vigencia_inicio) : null,
                formulario.vigencia_fin ? dayjs(formulario.vigencia_fin) : null,
            ],
        });
    }, [formulario, form]);

    const handleSave = async (values) => {
        const payload = {
            nombre: values.nombre,
            descripcion: values.descripcion,
            publico: values.publico,
            vigencia_inicio: values.vigencia?.[0]?.toISOString() ?? null,
            vigencia_fin: values.vigencia?.[1]?.toISOString() ?? null,
        };
        try {
            const updated = await formulariosApi.update(formulario.id, payload);
            message.success('Configuración guardada');
            onSaved?.(updated);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
        }
    };

    return (
        <Form layout="vertical" form={form} onFinish={handleSave} style={{ maxWidth: 720 }}>
            <Form.Item label="Slug" name="slug">
                <Input disabled />
            </Form.Item>
            <Form.Item
                label="Nombre"
                name="nombre"
                rules={[{ required: true, message: 'Nombre requerido' }]}
            >
                <Input />
            </Form.Item>
            <Form.Item label="Descripción" name="descripcion">
                <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item label="Vigencia (opcional)" name="vigencia">
                <DatePicker.RangePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="¿Público?" name="publico" valuePropName="checked" extra="Reservado para v2; en v1 todos los formularios requieren login.">
                <Switch disabled />
            </Form.Item>
            <Form.Item label="Estado actual">
                <Tag>{formulario?.estado}</Tag>
                <Tag color="blue">v{formulario?.version}</Tag>
            </Form.Item>
            <Form.Item>
                <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
                    Guardar configuración
                </Button>
            </Form.Item>
        </Form>
    );
}
