import { DatePicker, Form, Input, InputNumber, Select, Tabs } from 'antd';
import dayjs from 'dayjs';
import { COLOR_PROYECTO } from '@features/inicio/constants/roadmapModelo';

const { TextArea } = Input;

const PROYECTOS = Object.keys(COLOR_PROYECTO).map((v) => ({ value: v, label: v }));
const rejilla = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' };

export function CamposCiclo() {
    return (
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
                                <Form.Item name="nombre" label="Cómo se llama" rules={[{ required: true }]}>
                                    <Input placeholder="tamal-rojo" />
                                </Form.Item>
                                <Form.Item name="nota" label="Nota bajo el nombre">
                                    <Input placeholder="doce frentes, seis quincenas" />
                                </Form.Item>
                                <Form.Item name="color" label="Color" rules={[{ required: true }]}>
                                    <Input placeholder="#5C2472" />
                                </Form.Item>
                            </div>
                            <Form.Item name="motivo" label="Por qué importa">
                                <TextArea rows={3} />
                            </Form.Item>
                        </>
                    ),
                },
                {
                    key: 'donde',
                    label: 'Dónde va',
                    forceRender: true,
                    children: (
                        <div style={rejilla}>
                            <Form.Item name="x0" label="Empieza en" rules={[{ required: true }]}>
                                <InputNumber min={0} max={2400} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="x1" label="Termina en" rules={[{ required: true }]}>
                                <InputNumber min={0} max={2400} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="y0" label="Desde arriba" extra="Vacío ocupa todo el alto">
                                <InputNumber min={0} max={860} style={{ width: '100%' }} placeholder="todo el alto" />
                            </Form.Item>
                            <Form.Item name="y1" label="Hasta abajo">
                                <InputNumber min={0} max={860} style={{ width: '100%' }} placeholder="todo el alto" />
                            </Form.Item>
                        </div>
                    ),
                },
            ]}
        />
    );
}

export function CamposProceso({ form, vivo, legible }) {
    return (
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
                                    <Input placeholder="cuadernillos municipales" />
                                </Form.Item>
                                <Form.Item name="proy" label="De qué proyecto es" rules={[{ required: true }]}>
                                    <Select options={PROYECTOS} />
                                </Form.Item>
                            </div>
                            <Form.Item name="motivo" label="Por qué importa" rules={[{ required: true }]}>
                                <TextArea rows={3} />
                            </Form.Item>
                        </>
                    ),
                },
                {
                    key: 'cuando',
                    label: 'Cada cuándo',
                    forceRender: true,
                    children: (
                        <>
                            <Form.Item label="Primera edición" required>
                                <Form.Item name="desde" noStyle rules={[{ required: true, message: 'Elige una fecha' }]}>
                                    <Input hidden />
                                </Form.Item>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    format="D [de] MMMM [de] YYYY"
                                    value={vivo?.desde ? dayjs(vivo.desde) : null}
                                    onChange={(fecha) => {
                                        const iso = fecha ? fecha.format('YYYY-MM-DD') : '';
                                        form.setFieldsValue({
                                            desde: iso,
                                            cada: iso.slice(5),
                                            fecha: iso ? `anual · desde el ${legible(iso)}` : '',
                                        });
                                    }}
                                />
                            </Form.Item>
                            <div style={rejilla}>
                                <Form.Item
                                    name="cada"
                                    label="Se repite cada"
                                    extra="Mes y día, se toma de la primera edición"
                                    rules={[{ required: true, pattern: /^\d{2}-\d{2}$/, message: 'Usa MM-DD' }]}
                                >
                                    <Input placeholder="03-23" />
                                </Form.Item>
                                <Form.Item name="fecha" label="Cómo se lee" rules={[{ required: true }]}>
                                    <Input placeholder="anual · desde marzo de 2026" />
                                </Form.Item>
                            </div>
                        </>
                    ),
                },
            ]}
        />
    );
}
