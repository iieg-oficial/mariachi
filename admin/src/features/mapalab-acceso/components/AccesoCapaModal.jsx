import { useEffect, useMemo, useState } from 'react';
import { Form, Modal, Select, Spin, Switch, TreeSelect, Typography } from 'antd';
import { message } from '@shared/services/message';
import { guardarAccesoDeCapa, leerAccesoDeCapa } from '@features/mapalab-acceso/api/mapalabAccesoService';
import { errorDe } from '@features/mapalab-acceso/hooks/useMapalabAcceso';
import { nombresPorId, opcionesDeArbol } from '@features/mapalab-acceso/utils/arbolOpciones';

const { Text } = Typography;

const opcionUsuario = (u) => ({ value: u.id, label: u.nombre ? `${u.nombre} · ${u.correo}` : u.correo });

export default function AccesoCapaModal({ open, layerId, arbol, usuarios, grupos, onClose, onGuardado }) {
    const [form] = Form.useForm();
    const [capa, setCapa] = useState(layerId || null);
    const [acceso, setAcceso] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const privada = Form.useWatch('privada', form);
    const nombres = useMemo(() => nombresPorId(arbol), [arbol]);
    const opciones = useMemo(() => opcionesDeArbol(arbol), [arbol]);

    useEffect(() => {
        if (open) setCapa(layerId || null);
    }, [open, layerId]);

    useEffect(() => {
        if (!open || !capa) {
            setAcceso(null);
            form.resetFields();
            return;
        }
        let vigente = true;
        setCargando(true);
        leerAccesoDeCapa(capa)
            .then((datos) => {
                if (!vigente) return;
                setAcceso(datos);
                form.setFieldsValue({ privada: datos.privada || !layerId, usuarios: datos.usuarios, grupos: datos.grupos });
            })
            .catch((err) => message.error(errorDe(err, 'No se pudo leer el acceso de la capa')))
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [open, capa, layerId, form]);

    const guardar = async () => {
        const valores = await form.validateFields();
        setGuardando(true);
        try {
            await guardarAccesoDeCapa(capa, {
                privada: valores.privada,
                usuarios: valores.usuarios || [],
                grupos: valores.grupos || [],
            });
            message.success(valores.privada ? 'Acceso guardado' : 'La capa volvió a ser pública');
            onGuardado();
        } catch (err) {
            message.error(errorDe(err, 'No se pudo guardar el acceso'));
        } finally {
            setGuardando(false);
        }
    };

    const heredada = acceso?.heredadaDe || [];

    return (
        <Modal
            open={open}
            title={layerId ? `Acceso a «${acceso?.label || nombres[layerId] || layerId}»` : 'Marcar capa privada'}
            okText="Guardar"
            cancelText="Cancelar"
            onOk={guardar}
            onCancel={onClose}
            confirmLoading={guardando}
            okButtonProps={{ disabled: !capa }}
            destroyOnHidden
        >
            {!layerId && (
                <Form.Item label="Capa o carpeta" style={{ marginBottom: 16 }}>
                    <TreeSelect
                        value={capa}
                        onChange={setCapa}
                        treeData={opciones}
                        showSearch
                        treeNodeFilterProp="title"
                        placeholder="Busca la capa"
                        style={{ width: '100%' }}
                        styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
                    />
                </Form.Item>
            )}
            <Spin spinning={cargando}>
                <Form form={form} layout="vertical" disabled={!capa}>
                    <Form.Item name="privada" label="Privada" valuePropName="checked" tooltip="Una carpeta privada se lleva a todo lo que tiene dentro">
                        <Switch />
                    </Form.Item>
                    {privada && (
                        <>
                            <Form.Item name="usuarios" label="Personas">
                                <Select mode="multiple" allowClear options={usuarios.map(opcionUsuario)} optionFilterProp="label" placeholder="Nadie" />
                            </Form.Item>
                            <Form.Item name="grupos" label="Grupos">
                                <Select mode="multiple" allowClear options={grupos.map((g) => ({ value: g.id, label: g.nombre }))} optionFilterProp="label" placeholder="Ninguno" />
                            </Form.Item>
                        </>
                    )}
                    {heredada.length > 0 && (
                        <Text type="secondary">
                            Está dentro de {heredada.map((id) => `«${nombres[id] || id}»`).join(', ')}, también privada: para verla hace falta además el acceso de esa carpeta.
                        </Text>
                    )}
                </Form>
            </Spin>
        </Modal>
    );
}
