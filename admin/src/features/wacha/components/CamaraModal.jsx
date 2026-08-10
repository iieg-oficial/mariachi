import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Switch } from 'antd';

const CamaraModal = ({ abierto, camara, onCancelar, onGuardar, guardando }) => {
    const [form] = Form.useForm();
    const edicion = Boolean(camara);

    useEffect(() => {
        if (!abierto) return;
        if (camara) {
            form.setFieldsValue(camara);
        } else {
            form.resetFields();
        }
    }, [abierto, camara, form]);

    const aceptar = async () => {
        const valores = await form.validateFields();
        onGuardar(valores);
    };

    return (
        <Modal
            open={abierto}
            title={edicion ? `Editar ${camara.etiqueta}` : 'Nueva cámara'}
            onCancel={onCancelar}
            onOk={aceptar}
            confirmLoading={guardando}
            okText="Guardar"
            cancelText="Cancelar"
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    habilitada: true,
                    grabacion_habilitada: true,
                    deteccion_habilitada: false,
                    retencion_dias: 7,
                    orden: 0,
                }}
            >
                <Form.Item
                    name="nombre"
                    label="Nombre interno"
                    tooltip="Es la llave dentro de la configuración de wacha: minúsculas, números y guion bajo"
                    rules={[
                        { required: true, message: 'Requerido' },
                        {
                            pattern: /^[a-z][a-z0-9_]*$/,
                            message: 'Solo minúsculas, números y guion bajo, empezando por letra',
                        },
                    ]}
                >
                    <Input disabled={edicion} placeholder="recepcion" maxLength={20} />
                </Form.Item>

                <Form.Item
                    name="etiqueta"
                    label="Nombre visible"
                    rules={[{ required: true, message: 'Requerido' }]}
                >
                    <Input placeholder="Recepción" maxLength={200} />
                </Form.Item>

                <Form.Item name="ubicacion" label="Ubicación">
                    <Input.TextArea rows={2} placeholder="Planta baja, entrada principal" />
                </Form.Item>

                <Form.Item
                    name="rtsp_url"
                    label="URL RTSP"
                    rules={[
                        { required: true, message: 'Requerido' },
                        {
                            pattern: /^rtsp:\/\//,
                            message: 'Debe empezar con rtsp://',
                        },
                    ]}
                >
                    <Input placeholder="rtsp://usuario:contrasena@host:554/ruta" />
                </Form.Item>

                <Form.Item
                    name="retencion_dias"
                    label="Días de retención"
                    rules={[{ required: true, message: 'Requerido' }]}
                >
                    <InputNumber min={1} max={365} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item name="habilitada" label="Habilitada" valuePropName="checked">
                    <Switch />
                </Form.Item>

                <Form.Item name="grabacion_habilitada" label="Grabar" valuePropName="checked">
                    <Switch />
                </Form.Item>

                <Form.Item
                    name="deteccion_habilitada"
                    label="Detección de objetos"
                    valuePropName="checked"
                    tooltip="La VM no tiene acelerador: activarla consume CPU y puede degradar la grabación"
                >
                    <Switch />
                </Form.Item>

                <Form.Item name="orden" label="Orden" hidden>
                    <InputNumber />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default CamaraModal;
