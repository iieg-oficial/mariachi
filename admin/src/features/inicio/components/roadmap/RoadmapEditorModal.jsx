import { useEffect } from 'react';
import { useState } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Switch, Tabs } from 'antd';
import dayjs from 'dayjs';
import RoadmapPrevia from '@features/inicio/components/roadmap/RoadmapPrevia';
import {
    SelectorConexion,
    SelectorProyecto,
    SelectorTipo,
} from '@features/inicio/components/roadmap/RoadmapSelectores';
import { LEYENDAS } from '@features/inicio/constants/roadmapTipos';
import { CamposCiclo, CamposProceso } from '@features/inicio/components/roadmap/RoadmapCamposExtra';
import { COLOR_PROYECTO } from '@features/inicio/constants/roadmapModelo';

const { TextArea } = Input;

const ETIQUETA = { hitos: 'hito', ciclos: 'ciclo', procesos: 'proceso' };
const PROYECTOS = Object.keys(COLOR_PROYECTO).map((v) => ({ value: v, label: v }));
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const legible = (iso) => {
    const p = (iso || '').split('-');
    if (p.length !== 3) return iso || '';
    return `${Number(p[2])} ${MESES[Number(p[1]) - 1]} ${p[0]}`;
};

const rejilla = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' };

export default function RoadmapEditorModal({
    abierto, item, tipo, hitos, guardando, contenedor, onGuardar, onEliminar, onCerrar,
}) {
    const [form] = Form.useForm();
    const vivo = Form.useWatch([], form);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        if (abierto && item) form.setFieldsValue(item);
    }, [abierto, item, form]);

    if (!item) return null;

    return (
        <Modal
            open={abierto}
            onCancel={onCerrar}
            getContainer={contenedor || undefined}
            width={720}
            centered
            styles={{
                body: {
                    maxHeight: 'calc(100dvh - 208px)',
                    overflowY: 'auto',
                    paddingTop: 0,
                },
            }}
            title={`Editando ${ETIQUETA[tipo]}: ${item.txt || item.nombre}`}
            footer={(
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Button danger onClick={() => onEliminar(item.id)}>Eliminar</Button>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button onClick={onCerrar}>Cancelar</Button>
                        <Button type="primary" loading={guardando} onClick={() => form.submit()}>
                            Guardar
                        </Button>
                    </div>
                </div>
            )}
        >
            <div
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#fff',
                    paddingTop: 16,
                    paddingBottom: 12,
                }}
            >
                <div
                    style={{
                        background: 'repeating-linear-gradient(90deg, #fafafa 0 39px, #f2f2f2 39px 40px)',
                        border: '1px solid rgba(5,5,5,0.07)',
                        borderRadius: 8,
                        padding: '10px 12px',
                    }}
                >
                    <RoadmapPrevia
                        item={{ ...item, ...(vivo || {}) }}
                        tipo={tipo}
                        madre={(hitos || []).find((h) => h.id === (vivo?.naceDe ?? item.naceDe))}
                    />
                </div>
            </div>

            <Form form={form} layout="vertical" size="small" key={item.id} initialValues={item} onFinish={onGuardar}>
                {tipo === 'hitos' && (
                    <Tabs
                        size="small"
                        items={[
                            {
                                key: 'que',
                                label: 'Qué es',
                                forceRender: true,
                                children: (
                                    <>
                                        <div style={rejilla}>
                                            <Form.Item name="txt" label="Cómo se llama" rules={[{ required: true }]}>
                                                <Input placeholder="sextante 2" />
                                            </Form.Item>
                                            <Form.Item name="antes" label="Cómo se llamaba antes">
                                                <Input placeholder="geoserver" />
                                            </Form.Item>
                                        </div>
                                        <Form.Item name="proy" label="De qué proyecto es" rules={[{ required: true }]}>
                                            <SelectorProyecto />
                                        </Form.Item>
                                        <Form.Item name="tipo" label="Qué clase de hito es" rules={[{ required: true }]}>
                                            <SelectorTipo proyecto={vivo?.proy || item.proy} />
                                        </Form.Item>
                                        <Form.Item name="motivo" label="Por qué importa" rules={[{ required: true }]}>
                                            <TextArea rows={3} />
                                        </Form.Item>
                                    </>
                                ),
                            },
                            {
                                key: 'cuando',
                                label: 'Cuándo',
                                forceRender: true,
                                children: (
                                    <>
                                        <Form.Item label="Cuándo pasó" required>
                                            <Form.Item name="f" noStyle rules={[{ required: true, message: 'Elige una fecha' }]}>
                                                <Input hidden />
                                            </Form.Item>
                                            <DatePicker
                                                style={{ width: '100%' }}
                                                format="D [de] MMMM [de] YYYY"
                                                value={vivo?.f ? dayjs(vivo.f) : null}
                                                onChange={(fecha) => {
                                                    const iso = fecha ? fecha.format('YYYY-MM-DD') : '';
                                                    form.setFieldsValue({ f: iso, fecha: legible(iso) });
                                                }}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            name="fecha"
                                            label="Cómo se lee en el detalle"
                                            extra="Se escribe sola con la fecha. Cámbiala para casos como «por salir» o «2027 · sin fecha»."
                                            rules={[{ required: true }]}
                                        >
                                            <Input />
                                        </Form.Item>
                                        <div style={rejilla}>
                                            <Form.Item name="orden" label="Orden si comparten día">
                                                <InputNumber min={0} step={10} style={{ width: '100%' }} />
                                            </Form.Item>
                                            <Form.Item name="beta" label="Todavía en desarrollo" valuePropName="checked">
                                                <Switch size="small" />
                                            </Form.Item>
                                        </div>
                                    </>
                                ),
                            },
                            {
                                key: 'conexiones',
                                label: 'Conexiones',
                                forceRender: true,
                                children: (
                                    <>
                                        <Form.Item name="naceDe" label="Viene de otro hito">
                                            <SelectorConexion
                                                hitos={hitos || []}
                                                actual={item.id}
                                                busqueda={busqueda}
                                                onBuscar={setBusqueda}
                                            />
                                        </Form.Item>
                                        <div style={rejilla}>
                                            <Form.Item name="leyenda" label="Qué dice esa conexión">
                                                <Select allowClear placeholder="lo sucede" options={LEYENDAS.map((v) => ({ value: v, label: v }))} />
                                            </Form.Item>
                                            <Form.Item name="de" label="Pertenece a">
                                                <Select allowClear placeholder="ninguno" options={PROYECTOS} />
                                            </Form.Item>
                                        </div>
                                    </>
                                ),
                            },
                        ]}
                    />
                )}

                {tipo === 'ciclos' && <CamposCiclo />}

                {tipo === 'procesos' && <CamposProceso form={form} vivo={vivo} legible={legible} />}
            </Form>
        </Modal>
    );
}
