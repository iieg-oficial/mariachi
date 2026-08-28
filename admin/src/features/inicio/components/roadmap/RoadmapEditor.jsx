import { useEffect } from 'react';
import { Button, Card, Form, Input, Select, Space, Switch, Typography } from 'antd';
import { COLOR_PROYECTO, MARCADORES } from '@features/inicio/constants/roadmapModelo';

const { Text } = Typography;
const { TextArea } = Input;

const TIPOS = ['mayor', 'lanzamiento', 'joven', 'feature', 'momento', 'muerto', 'legacy', 'porllegar'];

export default function RoadmapEditor({ hito, marcador, guardando, onGuardar, onEliminar, onCerrar, onMarcador, onAgregar }) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (hito) form.setFieldsValue(hito);
    }, [hito, form]);

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

                {hito ? (
                    <Form form={form} layout="vertical" size="small" initialValues={hito} onFinish={onGuardar}>
                        <Text strong style={{ fontSize: 13 }}>{`Editando: ${hito.txt}`}</Text>
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
                            <Form.Item name="beta" label="En desarrollo" valuePropName="checked">
                                <Switch size="small" />
                            </Form.Item>
                        </div>
                        <Form.Item name="motivo" label="Motivo" rules={[{ required: true }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Space wrap>
                            <Button type="primary" htmlType="submit" loading={guardando}>Guardar</Button>
                            <Button danger onClick={(e) => { e.stopPropagation(); onEliminar(hito.id); }}>Eliminar</Button>
                            <Button onClick={(e) => { e.stopPropagation(); onCerrar(); }}>Volver</Button>
                        </Space>
                    </Form>
                ) : (
                    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Haz clic en cualquier hito para cambiar su etiqueta, su fecha, su proyecto o su tipo.
                            La fecha manda: el acomodo se recalcula solo.
                        </Text>
                        <Button
                            size="small"
                            loading={guardando}
                            onClick={(e) => { e.stopPropagation(); onAgregar(); }}
                        >
                            Agregar hito
                        </Button>
                    </Space>
                )}
            </Space>
        </Card>
    );
}
