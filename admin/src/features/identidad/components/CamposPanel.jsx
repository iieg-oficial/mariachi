import { useEffect, useState } from 'react';
import { Button, Form, Input, Space, Typography } from 'antd';
import { CAMPOS_LARGOS, SECCIONES } from '@features/identidad/constants/campos';

const { Text } = Typography;
const { TextArea } = Input;

export default function CamposPanel({ campos = {}, onGuardar, guardando }) {
    const [form] = Form.useForm();
    const [sucio, setSucio] = useState(false);

    useEffect(() => {
        form.setFieldsValue(campos);
        setSucio(false);
    }, [campos, form]);

    const enviar = async (valores) => {
        const limpios = Object.fromEntries(
            Object.entries(valores).filter(([, valor]) => valor !== undefined),
        );
        await onGuardar(limpios);
        setSucio(false);
    };

    return (
        <Form
            form={form}
            layout='vertical'
            onFinish={enviar}
            onValuesChange={() => setSucio(true)}
        >
            {SECCIONES.map((seccion) => (
                <div key={seccion.titulo} style={{ marginBottom: 24 }}>
                    <Text strong>{seccion.titulo}</Text>
                    <div style={{ marginTop: 12 }}>
                        {seccion.campos.map(([clave, etiqueta]) => (
                            <Form.Item key={clave} name={clave} label={etiqueta} style={{ marginBottom: 12 }}>
                                {CAMPOS_LARGOS.has(clave)
                                    ? <TextArea rows={2} placeholder='Sin definir' />
                                    : <Input placeholder='Sin definir' />}
                            </Form.Item>
                        ))}
                    </div>
                </div>
            ))}
            <Space>
                <Button type='primary' htmlType='submit' loading={guardando} disabled={!sucio}>
                    Guardar cambios
                </Button>
                <Text type='secondary'>
                    Lo que se deje vacío no aparece en la guía generada.
                </Text>
            </Space>
        </Form>
    );
}
