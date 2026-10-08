import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, DatePicker, Form, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { borrarIncidencia, crearIncidencia, getIncidencias } from '@features/vine/api/vineService';
import useCatalogo from '@features/vine/hooks/useCatalogo';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const fecha = (v) => new Date(`${v}T12:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: '2-digit',
});

const PanelIncidencias = ({ pin, puedeEditar, onCambio }) => {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const tiposIncidencia = useCatalogo('incidencia');
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setFilas(await getIncidencias(pin));
        } catch {
            setFilas([]);
        } finally {
            setCargando(false);
        }
    }, [pin]);

    useEffect(() => { cargar(); }, [cargar]);

    const agregar = async (valores) => {
        setGuardando(true);
        try {
            await crearIncidencia(pin, {
                desde: valores.rango[0].format('YYYY-MM-DD'),
                hasta: valores.rango[1].format('YYYY-MM-DD'),
                tipo: valores.tipo,
                nota: valores.nota || null,
            });
            message.success('Incidencia registrada');
            form.resetFields();
            await cargar();
            onCambio?.();
        } catch (e) {
            message.error(e?.response?.data?.detail || 'No se pudo registrar');
        } finally {
            setGuardando(false);
        }
    };

    const quitar = async (id) => {
        try {
            await borrarIncidencia(pin, id);
            message.success('Incidencia eliminada');
            await cargar();
            onCambio?.();
        } catch {
            message.error('No se pudo eliminar');
        }
    };

    const columnas = [
        {
            title: 'Tipo',
            dataIndex: 'nombre_tipo',
            key: 'tipo',
            render: (v, f) => <Tag color={tiposIncidencia.color[f.tipo] ?? 'default'}>{v}</Tag>,
        },
        {
            title: 'Periodo',
            key: 'periodo',
            render: (_, f) => (f.desde === f.hasta
                ? fecha(f.desde)
                : `${fecha(f.desde)} — ${fecha(f.hasta)}`),
        },
        {
            title: 'Días',
            dataIndex: 'dias',
            key: 'dias',
            align: 'right',
            width: 70,
        },
        {
            title: 'Efecto',
            dataIndex: 'efecto',
            key: 'efecto',
            width: 150,
            render: (v) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {v === 'descuenta' ? 'no cuenta como día hábil' : 'cuenta como asistencia'}
                </Text>
            ),
        },
        { title: 'Nota', dataIndex: 'nota', key: 'nota', responsive: ['lg'] },
        ...(puedeEditar ? [{
            title: '',
            key: 'acciones',
            width: 50,
            render: (_, f) => (
                <Popconfirm title="¿Eliminar esta incidencia?" onConfirm={() => quitar(f.id)}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        }] : []),
    ];

    return (
        <>
            {puedeEditar && (
                <Form form={form} layout="inline" size="small" onFinish={agregar} style={{ marginBottom: 12, rowGap: 8 }}>
                    <Form.Item name="tipo" rules={[{ required: true, message: 'Elige el tipo' }]}>
                        <Select placeholder="Tipo" style={{ width: 170 }} options={tiposIncidencia.opciones} loading={tiposIncidencia.cargando} />
                    </Form.Item>
                    <Form.Item name="rango" rules={[{ required: true, message: 'Elige las fechas' }]}>
                        <RangePicker format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item name="nota">
                        <Input placeholder="Nota (opcional)" style={{ width: 220 }} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={guardando}>
                            Agregar
                        </Button>
                    </Form.Item>
                </Form>
            )}
            <Table
                size="small"
                rowKey="id"
                loading={cargando}
                columns={columnas}
                dataSource={filas}
                pagination={false}
                locale={{ emptyText: 'Sin vacaciones, permisos ni incidencias registradas' }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                Los días de vacaciones, permiso, incapacidad, económicos y cumpleaños salen del
                total de días hábiles; comisión y capacitación cuentan como asistencia.
            </Text>
        </>
    );
};

export default PanelIncidencias;
