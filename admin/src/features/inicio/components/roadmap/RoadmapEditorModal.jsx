import { useEffect } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import RoadmapPrevia from '@features/inicio/components/roadmap/RoadmapPrevia';
import { COLOR_PROYECTO } from '@features/inicio/constants/roadmapModelo';

const { TextArea } = Input;

const TIPOS = ['mayor', 'lanzamiento', 'joven', 'feature', 'momento', 'muerto', 'legacy', 'porllegar'];
const ETIQUETA = { hitos: 'hito', ciclos: 'ciclo', procesos: 'proceso' };
const PROYECTOS = Object.keys(COLOR_PROYECTO).map((v) => ({ value: v, label: v }));

const rejilla = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' };

export default function RoadmapEditorModal({
    abierto, item, tipo, hitos, guardando, contenedor, onGuardar, onEliminar, onCerrar,
}) {
    const [form] = Form.useForm();
    const vivo = Form.useWatch([], form);

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
                    background: 'repeating-linear-gradient(90deg, #fafafa 0 39px, #f2f2f2 39px 40px)',
                    border: '1px solid rgba(5,5,5,0.07)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 16,
                }}
            >
                <RoadmapPrevia item={{ ...item, ...(vivo || {}) }} tipo={tipo} />
            </div>

            <Form form={form} layout="vertical" size="small" key={item.id} initialValues={item} onFinish={onGuardar}>
                {tipo === 'hitos' && (
                    <>
                        <div style={rejilla}>
                            <Form.Item name="txt" label="Etiqueta" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="f"
                                label="Fecha en el eje"
                                rules={[{ required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'Usa YYYY-MM-DD' }]}
                            >
                                <Input placeholder="2026-08-28" />
                            </Form.Item>
                            <Form.Item name="fecha" label="Fecha visible" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="proy" label="Proyecto" rules={[{ required: true }]}>
                                <Select options={PROYECTOS} />
                            </Form.Item>
                            <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                                <Select options={TIPOS.map((v) => ({ value: v, label: v }))} />
                            </Form.Item>
                            <Form.Item name="de" label="Feature de">
                                <Input placeholder="proyecto al que pertenece" />
                            </Form.Item>
                            <Form.Item name="antes" label="Nombre anterior">
                                <Input />
                            </Form.Item>
                            <Form.Item name="naceDe" label="Viene de">
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder="ninguno"
                                    optionFilterProp="label"
                                    options={(hitos || [])
                                        .filter((h) => h.id !== item.id)
                                        .map((h) => ({ value: h.id, label: h.txt }))}
                                />
                            </Form.Item>
                            <Form.Item name="leyenda" label="Qué dice la conexión">
                                <Input placeholder="se renombra, lo releva, lo sucede" />
                            </Form.Item>
                            <Form.Item name="orden" label="Orden en su día">
                                <InputNumber min={0} step={10} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="beta" label="En desarrollo" valuePropName="checked">
                                <Switch size="small" />
                            </Form.Item>
                        </div>
                        <Form.Item name="motivo" label="Motivo" rules={[{ required: true }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                    </>
                )}

                {tipo === 'ciclos' && (
                    <>
                        <div style={rejilla}>
                            <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="nota" label="Nota bajo el nombre">
                                <Input />
                            </Form.Item>
                            <Form.Item name="color" label="Color" rules={[{ required: true }]}>
                                <Input placeholder="#5C2472" />
                            </Form.Item>
                            <Form.Item name="x0" label="Empieza en" rules={[{ required: true }]}>
                                <InputNumber min={0} max={2400} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="x1" label="Termina en" rules={[{ required: true }]}>
                                <InputNumber min={0} max={2400} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="y0" label="Desde arriba">
                                <InputNumber min={0} max={860} style={{ width: '100%' }} placeholder="todo el alto" />
                            </Form.Item>
                            <Form.Item name="y1" label="Hasta abajo">
                                <InputNumber min={0} max={860} style={{ width: '100%' }} placeholder="todo el alto" />
                            </Form.Item>
                        </div>
                        <Form.Item name="motivo" label="Motivo">
                            <TextArea rows={3} />
                        </Form.Item>
                    </>
                )}

                {tipo === 'procesos' && (
                    <>
                        <div style={rejilla}>
                            <Form.Item name="txt" label="Etiqueta" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="proy" label="Proyecto" rules={[{ required: true }]}>
                                <Select options={PROYECTOS} />
                            </Form.Item>
                            <Form.Item
                                name="desde"
                                label="Primera edición"
                                rules={[{ required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'Usa YYYY-MM-DD' }]}
                            >
                                <Input placeholder="2026-03-23" />
                            </Form.Item>
                            <Form.Item
                                name="cada"
                                label="Se repite cada"
                                rules={[{ required: true, pattern: /^\d{2}-\d{2}$/, message: 'Usa MM-DD' }]}
                            >
                                <Input placeholder="03-23" />
                            </Form.Item>
                            <Form.Item name="fecha" label="Periodicidad visible" rules={[{ required: true }]}>
                                <Input placeholder="anual · desde marzo de 2026" />
                            </Form.Item>
                        </div>
                        <Form.Item name="motivo" label="Motivo" rules={[{ required: true }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                    </>
                )}
            </Form>
        </Modal>
    );
}
