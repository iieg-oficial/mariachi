import { useEffect } from 'react';
import { Form, Input, Modal, Select, Switch } from 'antd';

import { OPCIONES_TIPO } from '../constants/espacios';

const EditarEspacio = ({ espacio, pisos, guardando, onCancelar, onGuardar }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (espacio) form.setFieldsValue(espacio);
    }, [espacio, form]);

    return (
        <Modal
            open={Boolean(espacio)}
            title="Editar espacio"
            okText="Guardar"
            cancelText="Cancelar"
            confirmLoading={guardando}
            onCancel={onCancelar}
            onOk={() => form.validateFields().then(onGuardar)}
            destroyOnClose
        >
            <Form form={form} layout="vertical" requiredMark={false}>
                <Form.Item name="nombre" label="Nombre" rules={[{ required: true, max: 150 }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                    <Select options={OPCIONES_TIPO} />
                </Form.Item>
                <Form.Item name="piso_id" label="Piso" rules={[{ required: true }]}>
                    <Select options={pisos.map((piso) => ({ value: piso.id, label: piso.nombre }))} />
                </Form.Item>
                <Form.Item
                    name="incluir"
                    label="Se puede elegir en la intranet"
                    valuePropName="checked"
                    tooltip="Apagado, el espacio sigue en el plano pero no aparece para elegir"
                >
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default EditarEspacio;
