import { useEffect } from 'react';
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Typography } from 'antd';
import { COLOR_PROYECTO, MARCADORES } from '@features/inicio/constants/roadmapModelo';

const { Text } = Typography;
const { TextArea } = Input;

const TIPOS = ['mayor', 'lanzamiento', 'joven', 'feature', 'momento', 'muerto', 'legacy', 'porllegar'];

const ETIQUETA = { hitos: 'hito', ciclos: 'ciclo', procesos: 'proceso' };

export default function RoadmapEditor({ item, tipo, hitos, marcador, guardando, onGuardar, onEliminar, onCerrar, onMarcador, onAgregar }) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (item) form.setFieldsValue(item);
    }, [item, form]);

    return (
        <Card size="small" style={{ marginTop: 12 }}>
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <div>
                    <Text strong style={{ fontSize: 13 }}>Quién recorre la línea</Text>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {MARCADORES.map((emoji) => (
                            <Button
                                key={emoji}
                                size="large"
                                type={emoji === marcador ? 'primary' : 'default'}
                                aria-label={`Usar ${emoji} como marcador`}
                                onClick={(e) => { e.stopPropagation(); onMarcador(emoji); }}
                            >
                                {emoji}
                            </Button>
                        ))}
                    </div>
                </div>

                {item ? (
                    <Form form={form} layout="vertical" size="small" key={item.id} initialValues={item} onFinish={onGuardar}>
                        <Text strong style={{ fontSize: 13 }}>
                            {`Editando ${ETIQUETA[tipo]}: ${item.txt || item.nombre}`}
                        </Text>
                        {tipo === 'hitos' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 16px', marginTop: 8 }}>
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
                                    <Select options={Object.keys(COLOR_PROYECTO).map((v) => ({ value: v, label: v }))} />
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
                        )}
                        {tipo === 'ciclos' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 16px', marginTop: 8 }}>
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
                        )}
                        {tipo === 'procesos' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 16px', marginTop: 8 }}>
                                <Form.Item name="txt" label="Etiqueta" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                                <Form.Item name="proy" label="Proyecto" rules={[{ required: true }]}>
                                    <Select options={Object.keys(COLOR_PROYECTO).map((v) => ({ value: v, label: v }))} />
                                </Form.Item>
                                <Form.Item name="desde" label="Primera edición" rules={[{ required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'Usa YYYY-MM-DD' }]}>
                                    <Input placeholder="2026-03-23" />
                                </Form.Item>
                                <Form.Item name="cada" label="Se repite cada" rules={[{ required: true, pattern: /^\d{2}-\d{2}$/, message: 'Usa MM-DD' }]}>
                                    <Input placeholder="03-23" />
                                </Form.Item>
                                <Form.Item name="fecha" label="Periodicidad visible" rules={[{ required: true }]}>
                                    <Input placeholder="anual · desde marzo de 2026" />
                                </Form.Item>
                            </div>
                        )}
                        <Form.Item name="motivo" label="Motivo" rules={[{ required: true }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Space wrap>
                            <Button type="primary" htmlType="submit" loading={guardando}>Guardar</Button>
                            <Button danger onClick={(e) => { e.stopPropagation(); onEliminar(item.id); }}>Eliminar</Button>
                            <Button onClick={(e) => { e.stopPropagation(); onCerrar(); }}>Volver</Button>
                        </Space>
                    </Form>
                ) : (
                    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Haz clic en cualquier hito, banda de ciclo o proceso para editarlo. Los hitos
                            también se arrastran de lado para cambiarles la fecha.
                        </Text>
                        <Space wrap>
                            {['hitos', 'ciclos', 'procesos'].map((t) => (
                                <Button
                                    key={t}
                                    size="small"
                                    loading={guardando}
                                    onClick={(e) => { e.stopPropagation(); onAgregar(t); }}
                                >
                                    {`Agregar ${ETIQUETA[t]}`}
                                </Button>
                            ))}
                        </Space>
                    </Space>
                )}
            </Space>
        </Card>
    );
}
