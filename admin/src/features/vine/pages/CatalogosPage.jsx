import { AppstoreOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
    App, Button, Card, Form, Input, InputNumber, Popconfirm, Select, Space,
    Switch, Table, Tabs, Tag, TimePicker, Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';

import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';
import {
    actualizarCatalogo, borrarCatalogo, crearCatalogo, getCatalogos,
} from '@features/vine/api/vineService';

const { Text } = Typography;

const PERMISO_EDITAR = 'mariachi.vine_personas.update';

const COLORES = ['blue', 'geekblue', 'cyan', 'purple', 'magenta', 'gold', 'orange', 'volcano', 'red', 'green', 'default'];

const TIPOS = [
    { key: 'horario', label: 'Horarios', horas: true, ayuda: 'La entrada y la salida se usan para asignar el horario y medir la puntualidad.' },
    { key: 'vinculo', label: 'Vínculos', ayuda: 'Tipos de relación con el instituto. El color es el que se ve en las etiquetas.' },
    { key: 'tarjeta', label: 'Tarjetas', ayuda: 'Tarjetas que se pueden asignar a una persona en su ficha.' },
    { key: 'incidencia', label: 'Incidencias', efecto: true, ayuda: 'Descuenta saca el día del total de hábiles; presente lo cuenta como asistencia.' },
];

const TablaCatalogo = ({ tipo, config, puedeEditar }) => {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(true);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setFilas(await getCatalogos(tipo));
        } finally {
            setCargando(false);
        }
    }, [tipo]);

    useEffect(() => { cargar(); }, [cargar]);

    const guardar = async (id, datos) => {
        try {
            await actualizarCatalogo(id, datos);
            await cargar();
        } catch {
            message.error('No se pudo guardar');
        }
    };

    const agregar = async (valores) => {
        try {
            await crearCatalogo(tipo, {
                ...valores,
                entrada: valores.entrada ? valores.entrada.format('HH:mm') : null,
                salida: valores.salida ? valores.salida.format('HH:mm') : null,
            });
            message.success('Agregado');
            form.resetFields();
            await cargar();
        } catch (e) {
            message.error(e?.response?.data?.detail || 'No se pudo agregar');
        }
    };

    const quitar = async (id) => {
        try {
            await borrarCatalogo(id);
            message.success('Eliminado');
            await cargar();
        } catch {
            message.error('No se pudo eliminar');
        }
    };

    const columnas = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (v, f) => (puedeEditar
                ? <Input size="small" defaultValue={v} onBlur={(e) => e.target.value !== v && guardar(f.id, { nombre: e.target.value })} />
                : v),
        },
        { title: 'Clave', dataIndex: 'clave', key: 'clave', width: 150, render: (v) => <Text code>{v}</Text> },
        {
            title: 'Color',
            dataIndex: 'color',
            key: 'color',
            width: 140,
            render: (v, f) => (puedeEditar
                ? (
                    <Select
                        size="small"
                        style={{ width: 120 }}
                        value={v || 'default'}
                        options={COLORES.map((c) => ({ value: c, label: <Tag color={c}>{c}</Tag> }))}
                        onChange={(c) => guardar(f.id, { color: c })}
                    />
                )
                : <Tag color={v || 'default'}>{v}</Tag>),
        },
        ...(config.horas ? [
            {
                title: 'Entrada',
                dataIndex: 'entrada',
                key: 'entrada',
                width: 110,
                render: (v, f) => (puedeEditar
                    ? (
                        <TimePicker
                            size="small"
                            format="HH:mm"
                            value={v ? dayjs(v, 'HH:mm') : null}
                            onChange={(h) => guardar(f.id, { entrada: h ? h.format('HH:mm') : null })}
                        />
                    )
                    : v || '—'),
            },
            {
                title: 'Salida',
                dataIndex: 'salida',
                key: 'salida',
                width: 110,
                render: (v, f) => (puedeEditar
                    ? (
                        <TimePicker
                            size="small"
                            format="HH:mm"
                            value={v ? dayjs(v, 'HH:mm') : null}
                            onChange={(h) => guardar(f.id, { salida: h ? h.format('HH:mm') : null })}
                        />
                    )
                    : v || '—'),
            },
        ] : []),
        ...(config.efecto ? [{
            title: 'Efecto',
            dataIndex: 'efecto',
            key: 'efecto',
            width: 160,
            render: (v, f) => (puedeEditar
                ? (
                    <Select
                        size="small"
                        style={{ width: 140 }}
                        value={v || 'descuenta'}
                        options={[
                            { value: 'descuenta', label: 'Descuenta el día' },
                            { value: 'presente', label: 'Cuenta como asistencia' },
                        ]}
                        onChange={(e) => guardar(f.id, { efecto: e })}
                    />
                )
                : v),
        }] : []),
        {
            title: 'Orden',
            dataIndex: 'orden',
            key: 'orden',
            width: 90,
            render: (v, f) => (puedeEditar
                ? <InputNumber size="small" min={0} defaultValue={v} onBlur={(e) => guardar(f.id, { orden: Number(e.target.value) })} />
                : v),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 80,
            render: (v, f) => <Switch size="small" checked={v} disabled={!puedeEditar} onChange={(c) => guardar(f.id, { activo: c })} />,
        },
        ...(puedeEditar ? [{
            title: '',
            key: 'acciones',
            width: 50,
            render: (_, f) => (
                <Popconfirm
                    title="¿Eliminar?"
                    description="Si alguien lo tiene asignado, se queda con la clave suelta."
                    onConfirm={() => quitar(f.id)}
                >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        }] : []),
    ];

    return (
        <>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                {config.ayuda}
            </Text>
            {puedeEditar && (
                <Form form={form} layout="inline" size="small" onFinish={agregar} style={{ marginBottom: 12, rowGap: 8 }}>
                    <Form.Item name="clave" rules={[{ required: true, message: 'Clave' }]}>
                        <Input placeholder="clave" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item name="nombre" rules={[{ required: true, message: 'Nombre' }]}>
                        <Input placeholder="Nombre visible" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item name="color" initialValue="default">
                        <Select style={{ width: 130 }} options={COLORES.map((c) => ({ value: c, label: <Tag color={c}>{c}</Tag> }))} />
                    </Form.Item>
                    {config.horas && (
                        <>
                            <Form.Item name="entrada"><TimePicker format="HH:mm" placeholder="Entrada" /></Form.Item>
                            <Form.Item name="salida"><TimePicker format="HH:mm" placeholder="Salida" /></Form.Item>
                        </>
                    )}
                    {config.efecto && (
                        <Form.Item name="efecto" initialValue="descuenta">
                            <Select
                                style={{ width: 180 }}
                                options={[
                                    { value: 'descuenta', label: 'Descuenta el día' },
                                    { value: 'presente', label: 'Cuenta como asistencia' },
                                ]}
                            />
                        </Form.Item>
                    )}
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Agregar</Button>
                    </Form.Item>
                </Form>
            )}
            <Table size="small" rowKey="id" loading={cargando} columns={columnas} dataSource={filas} pagination={false} />
        </>
    );
};

const CatalogosPage = () => {
    const { can } = useAuth();
    const puedeEditar = can(PERMISO_EDITAR);

    return (
        <div>
            <PageHeading
                icon={<AppstoreOutlined />}
                title="Catálogos de vine"
                description="Horarios, vínculos, tarjetas y tipos de incidencia que se eligen en la ficha del personal"
            />
            <Card size="small">
                <Tabs
                    items={TIPOS.map((t) => ({
                        key: t.key,
                        label: t.label,
                        children: <TablaCatalogo tipo={t.key} config={t} puedeEditar={puedeEditar} />,
                    }))}
                />
            </Card>
        </div>
    );
};

export default CatalogosPage;
