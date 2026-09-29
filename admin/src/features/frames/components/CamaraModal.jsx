import { useEffect, useMemo, useState } from 'react';
import {
    Button, Form, Input, InputNumber, Modal, Segmented, Space, Switch, Typography,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import TituloConAyuda from '@shared/components/TituloConAyuda';

import {
    CONEXION_DIRECTA,
    CONEXION_NVR,
    aNombreInterno,
    RUTA_DIRECTA,
    componerRtsp,
    conexionRecordada,
    enmascarar,
    recordarConexion,
} from '../utils/camara';

const { Text } = Typography;

const MODOS = [
    { label: 'IP propia', value: CONEXION_DIRECTA },
    { label: 'Por el NVR', value: CONEXION_NVR },
];

const AYUDA_MODO = 'Por el grabador basta una credencial para todas las cámaras y el canal arma '
    + 'la ruta solo. Directo a la IP, cada cámara tiene su propia contraseña.';

const AYUDA_INTERNO = 'Es la llave dentro de la configuración de frames. Se deriva del nombre '
    + 'visible; solo se captura si necesitas otro.';

const AYUDA_DETECCION = 'La VM no tiene acelerador: activarla consume CPU y puede degradar la '
    + 'transmisión.';

const CamaraModal = ({ abierto, camara, onCancelar, onGuardar, guardando }) => {
    const [form] = Form.useForm();
    const [modo, setModo] = useState(CONEXION_DIRECTA);
    const [manual, setManual] = useState(false);
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

    const compuesta = !edicion && !manual;
    const porNvr = compuesta && modo === CONEXION_NVR;

    useEffect(() => {
        if (!abierto) return;
        setManual(false);
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
        onGuardar({
            ...resto,
            nombre: resto.nombre || derivado,
            rtsp_url: compuesta ? urlCompuesta : resto.rtsp_url,
        });
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

                {!edicion && (
                    <Form.Item label={<TituloConAyuda titulo="Cómo se conecta" ayuda={AYUDA_MODO} />}>
                        <Segmented options={MODOS} value={modo} onChange={setModo} block />
                    </Form.Item>
                )}

                {compuesta ? (
                    <>
                        <Form.Item
                            name={['conexion', 'host']}
                            label={porNvr ? 'IP del grabador' : 'IP de la cámara'}
                            rules={[{ required: true, message: 'Requerido' }]}
                        >
                            <Input placeholder="10.0.0.10" />
                        </Form.Item>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {porNvr && (
                                <Form.Item
                                    name={['conexion', 'canal']}
                                    label="Canal"
                                    style={{ flex: '0 0 96px' }}
                                    rules={[{ required: true, message: 'Requerido' }]}
                                >
                                    <InputNumber min={1} max={32} style={{ width: '100%' }} />
                                </Form.Item>
                            )}
                            <Form.Item
                                name={['conexion', 'usuario']}
                                label="Usuario"
                                style={{ flex: 1, minWidth: 140 }}
                                rules={[{ required: true, message: 'Requerido' }]}
                            >
                                <Input autoComplete="off" />
                            </Form.Item>
                            <Form.Item
                                name={['conexion', 'contrasena']}
                                label="Contraseña"
                                style={{ flex: 1, minWidth: 140 }}
                                rules={[{ required: true, message: 'Requerido' }]}
                            >
                                <Input.Password autoComplete="new-password" />
                            </Form.Item>
                        </div>

                        <Space size={8} style={{ marginBottom: 16 }} wrap>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {urlCompuesta
                                    ? enmascarar(urlCompuesta)
                                    : `La URL se arma sola · termina en ${RUTA_DIRECTA}`}
                            </Text>
                            <Button
                                type="link"
                                size="small"
                                icon={<EditOutlined />}
                                style={{ padding: 0, height: 'auto' }}
                                onClick={() => {
                                    form.setFieldValue('rtsp_url', urlCompuesta);
                                    setManual(true);
                                }}
                            >
                                Personalizar
                            </Button>
                        </Space>
                    </>
                ) : (
                    <Form.Item
                        name="rtsp_url"
                        label="URL RTSP"
                        rules={[
                            { required: true, message: 'Requerido' },
                            { pattern: /^rtsp:\/\//, message: 'Debe empezar con rtsp://' },
                        ]}
                    >
                        <Input placeholder="rtsp://usuario:contrasena@host:554/ruta" />
                    </Form.Item>
                )}

                {manual && !edicion && (
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
