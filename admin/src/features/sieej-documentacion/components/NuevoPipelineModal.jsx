import { useState } from 'react';
import { Form, Input, Modal } from 'antd';
import { message } from '@shared/services/message';
import { crearPipeline } from '../services/documentacionApi';
import { errorDetalle } from '../constants/secciones';

const aClave = (texto) => texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

export default function NuevoPipelineModal({ open, onClose, onCreado }) {
    const [form] = Form.useForm();
    const [guardando, setGuardando] = useState(false);
    const [claveTocada, setClaveTocada] = useState(false);

    const cerrar = () => {
        form.resetFields();
        setClaveTocada(false);
        onClose();
    };

    const guardar = async () => {
        const datos = await form.validateFields();
        setGuardando(true);
        try {
            const creado = await crearPipeline(datos);
            message.success('Pipeline creado como borrador');
            form.resetFields();
            setClaveTocada(false);
            onCreado(creado);
        } catch (err) {
            message.error(errorDetalle(err, 'No se pudo crear el pipeline'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal
            open={open}
            title="Nuevo pipeline"
            okText="Crear"
            cancelText="Cancelar"
            okButtonProps={{ shape: 'round' }}
            cancelButtonProps={{ shape: 'round' }}
            confirmLoading={guardando}
            onOk={guardar}
            onCancel={cerrar}
            destroyOnHidden
        >
            <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                onValuesChange={(cambio) => {
                    if ('titulo' in cambio && !claveTocada) form.setFieldValue('clave', aClave(cambio.titulo));
                }}
            >
                <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Escribe el título' }]}>
                    <Input placeholder="Censo Agropecuario" maxLength={200} />
                </Form.Item>
                <Form.Item name="producto" label="Producto" tooltip="Nombre largo de la fuente; aparece bajo el título">
                    <Input placeholder="Censo Agropecuario 2022 (INEGI)" maxLength={300} />
                </Form.Item>
                <Form.Item
                    name="clave"
                    label="Clave"
                    tooltip="Va en la URL del sitio. Si coincide con la carpeta del ETL, el sincronizador le agrega tablas y DAGs"
                    rules={[
                        { required: true, message: 'Escribe la clave' },
                        { pattern: /^[a-z0-9_]{2,80}$/, message: 'Solo minúsculas, números y guion bajo' },
                    ]}
                >
                    <Input placeholder="censo_agropecuario" onChange={() => setClaveTocada(true)} />
                </Form.Item>
            </Form>
        </Modal>
    );
}
