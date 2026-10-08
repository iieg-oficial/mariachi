import { useEffect, useMemo, useState } from 'react';
import {
    Button, Form, Input, InputNumber, Modal, Space, Switch, Typography,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import TituloConAyuda from '@shared/components/TituloConAyuda';

import ConexionCamara from './ConexionCamara';

import {
    CONEXION_DIRECTA,
    CONEXION_NVR,
    aNombreInterno,
    componerRtsp,
    conexionRecordada,
    recordarConexion,
} from '../utils/camara';

const { Text } = Typography;

const AYUDA_INTERNO = 'Es la llave dentro de la configuración de frames. Se deriva del nombre '
    + 'visible; solo se captura si necesitas otro.';

const AYUDA_DETECCION = 'La VM no tiene acelerador: activarla consume CPU y puede degradar la '
    + 'transmisión.';

const CamaraModal = ({ abierto, camara, onCancelar, onGuardar, guardando }) => {
    const [form] = Form.useForm();
    const [modo, setModo] = useState(CONEXION_DIRECTA);
    const [manual, setManual] = useState(false);
    const [cambiandoConexion, setCambiandoConexion] = useState(false);
    const edicion = Boolean(camara);

    const etiqueta = Form.useWatch('etiqueta', form);
    const nombre = Form.useWatch('nombre', form);
    const graba = Form.useWatch('grabacion_habilitada', form);
    const conexion = Form.useWatch('conexion', form);

    const derivado = useMemo(() => aNombreInterno(etiqueta), [etiqueta]);

    const urlCompuesta = useMemo(() => componerRtsp({
        usuario: conexion?.usuario,
        contrasena: conexion?.contrasena,
        host: conexion?.host,
        canal: modo === CONEXION_NVR ? conexion?.canal : undefined,
    }), [conexion, modo]);

    const editaConexion = !edicion || cambiandoConexion;
    const compuesta = editaConexion && !manual;
    const porNvr = compuesta && modo === CONEXION_NVR;

    useEffect(() => {
        if (!abierto) return;
        setManual(false);
        setCambiandoConexion(false);
        if (camara) {
            setModo(CONEXION_DIRECTA);
            form.setFieldsValue(camara);
            return;
        }
        setModo(CONEXION_DIRECTA);
        form.resetFields();
        const recordado = conexionRecordada();
        if (recordado) form.setFieldValue('conexion', { ...recordado, puerto: 554 });
    }, [abierto, camara, form]);

    const aceptar = async () => {
        const valores = await form.validateFields();
        const { conexion: partes, ...resto } = valores;
        if (compuesta) {
            recordarConexion({ usuario: partes?.usuario, host: partes?.host });
        }
        const payload = {
            ...resto,
            nombre: resto.nombre || derivado,
            rtsp_url: compuesta ? urlCompuesta : resto.rtsp_url,
        };
        if (edicion && !cambiandoConexion) delete payload.rtsp_url;
        onGuardar(payload);
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
            width={560}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    habilitada: true,
                    grabacion_habilitada: false,
                    deteccion_habilitada: false,
                    retencion_dias: 7,
                    orden: 0,
                }}
            >
                <Form.Item
                    name="etiqueta"
                    label="Nombre visible"
                    rules={[{ required: true, message: 'Requerido' }]}
                    style={{ marginBottom: 4 }}
                >
                    <Input placeholder="Recepción" maxLength={200} />
                </Form.Item>

                {!edicion && (
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
                        Nombre interno: <b>{nombre || derivado || '—'}</b>
                    </Text>
                )}

                <Form.Item
                    name="nombre"
                    label={<TituloConAyuda titulo="Nombre interno" ayuda={AYUDA_INTERNO} />}
                    rules={[{
                        pattern: /^[a-z][a-z0-9_]*$/,
                        message: 'Solo minúsculas, números y guion bajo, empezando por letra',
                    }]}
                >
                    <Input disabled={edicion} placeholder={derivado || 'recepcion'} maxLength={20} />
                </Form.Item>

                <ConexionCamara
                    modo={modo}
                    onModo={setModo}
                    compuesta={compuesta}
                    porNvr={porNvr}
                    editaConexion={editaConexion}
                    manual={manual}
                    onManual={(v) => {
                        if (v) form.setFieldValue('rtsp_url', urlCompuesta);
                        setManual(v);
                    }}
                    urlCompuesta={urlCompuesta}
                    urlActual={camara?.rtsp_url}
                    onCambiar={() => {
                        setModo(CONEXION_DIRECTA);
                        setManual(false);
                        setCambiandoConexion(true);
                    }}
                />

                {edicion && cambiandoConexion && (
                    <Button
                        type="link"
                        size="small"
                        style={{ padding: 0, height: 'auto', marginBottom: 16 }}
                        onClick={() => {
                            setCambiandoConexion(false);
                            setManual(false);
                            form.setFieldValue('rtsp_url', camara?.rtsp_url);
                        }}
                    >
                        Conservar la conexión actual
                    </Button>
                )}

                {manual && (
                    <Button
                        type="link"
                        size="small"
                        style={{ padding: 0, height: 'auto', marginBottom: 16 }}
                        onClick={() => setManual(false)}
                    >
                        Volver a armarla sola
                    </Button>
                )}

                <Form.Item name="ubicacion" label="Ubicación">
                    <Input.TextArea rows={2} placeholder="Planta baja, entrada principal" />
                </Form.Item>

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <Form.Item name="habilitada" label="Habilitada" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item name="grabacion_habilitada" label="Grabar" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        name="deteccion_habilitada"
                        label={<TituloConAyuda titulo="Detectar" ayuda={AYUDA_DETECCION} />}
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                    {graba ? (
                        <Form.Item
                            name="retencion_dias"
                            label="Días de retención"
                            rules={[{ required: true, message: 'Requerido' }]}
                        >
                            <InputNumber min={1} max={365} />
                        </Form.Item>
                    ) : null}
                </div>

                <Form.Item name="orden" hidden><InputNumber /></Form.Item>
            </Form>
        </Modal>
    );
};

export default CamaraModal;
