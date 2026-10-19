import { useState } from 'react';
import {
    Button, Checkbox, Form, Input, InputNumber, List, Modal, Space, Tag, Typography, message,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';

import { createCamara, descubrirNvr } from '../api/framesService';
import { aNombreInterno, componerRtsp } from '../utils/camara';

const { Text } = Typography;

const AYUDA = 'Se consulta el inventario del grabador por su interfaz web (ISAPI). Las cámaras '
    + 'entran apagadas y con el canal correcto; las enciendes de dos en dos.';

const nombreDe = (canal, usados) => {
    let nombre = aNombreInterno(canal.nombre) || `camara_${canal.canal}`;
    if (usados.has(nombre)) nombre = `${nombre}_${canal.canal}`.slice(0, 20);
    usados.add(nombre);
    return nombre;
};

const ImportarNvr = ({ abierto, onCerrar, onImportado }) => {
    const [form] = Form.useForm();
    const [canales, setCanales] = useState([]);
    const [seleccion, setSeleccion] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [importando, setImportando] = useState(false);

    const cerrar = () => {
        setCanales([]);
        setSeleccion([]);
        form.resetFields();
        onCerrar();
    };

    const buscar = async () => {
        const cfg = await form.validateFields();
        setBuscando(true);
        try {
            const lista = await descubrirNvr(cfg);
            setCanales(lista);
            setSeleccion(lista.filter((c) => c.en_linea).map((c) => c.canal));
            if (!lista.length) message.info('El NVR no devolvió canales');
        } catch (error) {
            message.error(error?.response?.data?.detail || 'No se pudo consultar el NVR');
        } finally {
            setBuscando(false);
        }
    };

    const importar = async () => {
        const cfg = form.getFieldsValue();
        const elegidos = canales.filter((c) => seleccion.includes(c.canal));
        setImportando(true);
        const usados = new Set();
        let ok = 0;
        let err = 0;
        for (const canal of elegidos) {
            const payload = {
                nombre: nombreDe(canal, usados),
                etiqueta: canal.nombre || `Canal ${canal.canal}`,
                rtsp_url: componerRtsp({
                    usuario: cfg.usuario,
                    contrasena: cfg.contrasena,
                    host: cfg.host,
                    canal: canal.canal,
                }),
                habilitada: false,
                grabacion_habilitada: false,
                deteccion_habilitada: false,
                retencion_dias: 7,
                orden: 0,
            };
            try {
                await createCamara(payload);
                ok += 1;
            } catch {
                err += 1;
            }
        }
        setImportando(false);
        if (ok) message.success(`${ok} cámara(s) importada(s), apagadas`);
        if (err) message.warning(`${err} no se importaron (puede que ya existieran)`);
        cerrar();
        onImportado();
    };

    const alternar = (canal, marcado) => {
        setSeleccion((prev) => (marcado ? [...prev, canal] : prev.filter((c) => c !== canal)));
    };

    return (
        <Modal
            open={abierto}
            title="Importar del NVR"
            onCancel={cerrar}
            onOk={importar}
            okText={seleccion.length ? `Importar ${seleccion.length}` : 'Importar'}
            okButtonProps={{ disabled: !seleccion.length, loading: importando }}
            cancelText="Cancelar"
            destroyOnClose
            width={560}
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
                {AYUDA}
            </Text>

            <Form form={form} layout="vertical" initialValues={{ usuario: 'admin', puerto: 8080 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Form.Item
                        name="host"
                        label="IP del grabador"
                        style={{ flex: 1, minWidth: 180 }}
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input placeholder="192.0.2.10" />
                    </Form.Item>
                    <Form.Item name="puerto" label="Puerto" style={{ flex: '0 0 96px' }}>
                        <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                    </Form.Item>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Form.Item
                        name="usuario"
                        label="Usuario"
                        style={{ flex: 1, minWidth: 140 }}
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input autoComplete="off" />
                    </Form.Item>
                    <Form.Item
                        name="contrasena"
                        label="Contraseña"
                        style={{ flex: 1, minWidth: 140 }}
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input.Password autoComplete="new-password" />
                    </Form.Item>
                </div>
                <Button icon={<SearchOutlined />} onClick={buscar} loading={buscando}>
                    Buscar canales
                </Button>
            </Form>

            {canales.length ? (
                <List
                    size="small"
                    style={{ marginTop: 16, maxHeight: 280, overflow: 'auto' }}
                    dataSource={canales}
                    rowKey={(c) => c.canal}
                    renderItem={(canal) => (
                        <List.Item>
                            <Checkbox
                                checked={seleccion.includes(canal.canal)}
                                onChange={(e) => alternar(canal.canal, e.target.checked)}
                            >
                                <Space size={8}>
                                    <span>{canal.nombre || `Canal ${canal.canal}`}</span>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {`canal ${canal.canal}`}{canal.ip ? ` · ${canal.ip}` : ''}
                                    </Text>
                                </Space>
                            </Checkbox>
                            <Tag color={canal.en_linea ? 'green' : 'red'}>
                                {canal.en_linea ? 'en línea' : 'sin señal'}
                            </Tag>
                        </List.Item>
                    )}
                />
            ) : null}
        </Modal>
    );
};

export default ImportarNvr;
