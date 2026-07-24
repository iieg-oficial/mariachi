import { useEffect } from 'react';
import {
    Alert, Button, DatePicker, Form, Input, InputNumber, Select, Switch, Tag,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';
import { FRECUENCIA_OPTIONS } from '../constants/definitionTypes';

export default function ConfiguracionEditor({ formulario, onSaved }) {
    const [form] = Form.useForm();
    const periodico = Form.useWatch('periodico', form);

    useEffect(() => {
        if (!formulario) return;
        const per = formulario.periodicidad;
        form.setFieldsValue({
            slug: formulario.slug,
            nombre: formulario.nombre,
            descripcion: formulario.descripcion ?? '',
            publico: formulario.publico,
            vigencia: [
                formulario.vigencia_inicio ? dayjs(formulario.vigencia_inicio) : null,
                formulario.vigencia_fin ? dayjs(formulario.vigencia_fin) : null,
            ],
            periodico: !!per,
            frecuencia: per?.frecuencia ?? 'mensual',
            dia_inicio: per?.dia_inicio ?? 1,
            duracion_dias: per?.duracion_dias ?? 7,
            ancla: per?.ancla ? dayjs(per.ancla) : null,
        });
    }, [formulario, form]);

    const handleSave = async (values) => {
        const esPeriodico = values.periodico;
        const payload = {
            nombre: values.nombre,
            descripcion: values.descripcion,
            publico: values.publico,
            vigencia_inicio: esPeriodico ? null : (values.vigencia?.[0]?.toISOString() ?? null),
            vigencia_fin: esPeriodico ? null : (values.vigencia?.[1]?.toISOString() ?? null),
            periodicidad: esPeriodico
                ? {
                    frecuencia: values.frecuencia,
                    dia_inicio: values.dia_inicio,
                    duracion_dias: values.duracion_dias,
                    ...(values.ancla ? { ancla: values.ancla.format('YYYY-MM-DD') } : {}),
                }
                : null,
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

            <Form.Item
                label="Apertura periódica"
                name="periodico"
                valuePropName="checked"
                extra="El formulario abre una ventana de captura recurrente. Cada periodo genera un envío nuevo y se avisa al abrir y de los faltantes al cerrar."
            >
                <Switch />
            </Form.Item>

            {periodico ? (
                <>
                    <Form.Item
                        label="Frecuencia"
                        name="frecuencia"
                        rules={[{ required: true, message: 'Frecuencia requerida' }]}
                    >
                        <Select options={FRECUENCIA_OPTIONS} style={{ maxWidth: 260 }} />
                    </Form.Item>
                    <Form.Item
                        label="Día de apertura (dentro del periodo)"
                        name="dia_inicio"
                        extra="Día del primer mes del periodo en que abre la ventana (1–28)."
                        rules={[{ required: true, message: 'Día requerido' }]}
                    >
                        <InputNumber min={1} max={28} style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item
                        label="Duración de la ventana (días)"
                        name="duracion_dias"
                        rules={[{ required: true, message: 'Duración requerida' }]}
                    >
                        <InputNumber min={1} style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item
                        label="Inicio (opcional)"
                        name="ancla"
                        extra="Si se indica, no se abren ventanas antes de esta fecha."
                    >
                        <DatePicker style={{ width: 220 }} />
                    </Form.Item>
                </>
            ) : (
                <Form.Item label="Vigencia (opcional)" name="vigencia">
                    <DatePicker.RangePicker showTime style={{ width: '100%' }} />
                </Form.Item>
            )}

            {periodico && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Al publicar un formulario periódico se generan sus primeras ventanas. Revisa la pestaña «Periodos» para ver aperturas, cierres y la bitácora de avisos."
                />
            )}

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
