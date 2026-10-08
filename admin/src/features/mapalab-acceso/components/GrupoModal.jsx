import { useEffect, useState } from 'react';
import { Form, Input, Modal, Select } from 'antd';

export default function GrupoModal({ open, grupo, usuarios, onClose, onGuardar }) {
    const [form] = Form.useForm();
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!open) return;
        form.setFieldsValue({
            nombre: grupo?.nombre || '',
            descripcion: grupo?.descripcion || '',
            miembros: grupo?.miembros || [],
        });
    }, [open, grupo, form]);

    const guardar = async () => {
        const valores = await form.validateFields();
        setGuardando(true);
        const ok = await onGuardar(valores);
        setGuardando(false);
        if (ok) onClose();
    };

    return (
        <Modal
            open={open}
            title={grupo ? `Editar «${grupo.nombre}»` : 'Nuevo grupo'}
            okText="Guardar"
            cancelText="Cancelar"
            onOk={guardar}
            onCancel={onClose}
            confirmLoading={guardando}
            destroyOnHidden
        >
            <Form form={form} layout="vertical">
                <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ponle nombre al grupo' }]}>
                    <Input maxLength={120} placeholder="Geografía" />
                </Form.Item>
                <Form.Item name="descripcion" label="Descripción">
                    <Input maxLength={300} />
                </Form.Item>
                <Form.Item name="miembros" label="Personas">
                    <Select
                        mode="multiple"
                        allowClear
                        optionFilterProp="label"
                        options={usuarios.map((u) => ({ value: u.id, label: u.nombre ? `${u.nombre} · ${u.correo}` : u.correo }))}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
