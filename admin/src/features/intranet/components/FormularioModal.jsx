import { useEffect } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Switch, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import TituloConAyuda from '@shared/components/TituloConAyuda';

const archivoDe = (evento) => evento?.fileList?.slice(-1) ?? [];

const Control = ({ campo }) => {
    switch (campo.tipo) {
    case 'numero':
        return <InputNumber min={0} style={{ width: '100%' }} />;
    case 'texto-largo':
        return <Input.TextArea rows={3} maxLength={campo.maximo} showCount />;
    case 'opciones':
        return <Select options={campo.opciones} allowClear={!campo.requerido} />;
    case 'interruptor':
        return <Switch />;
    default:
        return <Input maxLength={campo.maximo} />;
    }
};

const Campo = ({ campo }) => {
    const etiqueta = <TituloConAyuda titulo={campo.etiqueta} ayuda={campo.ayuda} />;
    const reglas = campo.requerido ? [{ required: true, message: `Falta: ${campo.etiqueta}` }] : [];

    if (campo.tipo === 'archivo') {
        return (
            <Form.Item
                name={campo.nombre}
                label={etiqueta}
                rules={reglas}
                valuePropName="fileList"
                getValueFromEvent={archivoDe}
            >
                <Upload beforeUpload={() => false} maxCount={1} accept={campo.acepta}>
                    <Button icon={<UploadOutlined />}>Elegir archivo</Button>
                </Upload>
            </Form.Item>
        );
    }

    return (
        <Form.Item
            name={campo.nombre}
            label={etiqueta}
            rules={reglas}
            valuePropName={campo.tipo === 'interruptor' ? 'checked' : 'value'}
        >
            <Control campo={campo} />
        </Form.Item>
    );
};

const FormularioModal = ({ abierto, titulo, campos, inicial, guardando, onCancelar, onGuardar }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (!abierto) return;
        form.resetFields();
        if (inicial) form.setFieldsValue(inicial);
    }, [abierto, inicial, form]);

    const aceptar = async () => {
        const valores = await form.validateFields();
        const planos = Object.fromEntries(
            Object.entries(valores).map(([clave, valor]) => [
                clave,
                Array.isArray(valor) ? valor[0]?.originFileObj : valor,
            ]),
        );
        onGuardar(planos);
    };

    return (
        <Modal
            open={abierto}
            title={titulo}
            onCancel={onCancelar}
            onOk={aceptar}
            okText="Guardar"
            cancelText="Cancelar"
            confirmLoading={guardando}
            destroyOnHidden
        >
            <Form form={form} layout="vertical" requiredMark="optional">
                {campos.map((campo) => <Campo key={campo.nombre} campo={campo} />)}
            </Form>
        </Modal>
    );
};

export default FormularioModal;
