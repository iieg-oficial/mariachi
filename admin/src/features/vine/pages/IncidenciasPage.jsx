import { CalendarOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
    Alert, App, Button, Card, Col, DatePicker, Form, Input, Popconfirm,
    Row, Select, Space, Table, Tag, Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';
import {
    borrarIncidencia, crearIncidenciasMasivas, getListadoIncidencias, getPersonal,
} from '@features/vine/api/vineService';
import { COLOR_VINCULO } from '@features/vine/constants';
import useCatalogo from '@features/vine/hooks/useCatalogo';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const PERMISO_EDITAR = 'mariachi.vine_personas.update';

const fecha = (v) => new Date(`${v}T12:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: '2-digit',
});

const IncidenciasPage = () => {
    const { can } = useAuth();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const tiposIncidencia = useCatalogo('incidencia');
    const puedeEditar = can(PERMISO_EDITAR);

    const [personas, setPersonas] = useState([]);
    const [incidencias, setIncidencias] = useState([]);
    const [vinculo, setVinculo] = useState(null);
    const [seleccion, setSeleccion] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const [p, i] = await Promise.all([getPersonal(365), getListadoIncidencias()]);
            setPersonas(p);
            setIncidencias(i);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const vinculos = useMemo(
        () => [...new Set(personas.map((p) => p.vinculo).filter(Boolean))].sort()
            .map((v) => ({ value: v, label: v })),
        [personas],
    );

    const candidatos = useMemo(
        () => (vinculo ? personas.filter((p) => p.vinculo === vinculo) : personas),
        [personas, vinculo],
    );

    const aplicar = async (valores) => {
        const pins = seleccion.length ? seleccion : candidatos.map((p) => p.pin);
        if (!pins.length) {
            message.warning('No hay personas a las que aplicar');
            return;
        }
        setGuardando(true);
        try {
            const r = await crearIncidenciasMasivas({
                pins,
                desde: valores.rango[0].format('YYYY-MM-DD'),
                hasta: valores.rango[1].format('YYYY-MM-DD'),
                tipo: valores.tipo,
                nota: valores.nota || null,
            });
            message.success(`Registrado en ${r.creadas} personas`);
            form.resetFields();
            setSeleccion([]);
            await cargar();
        } catch (e) {
            message.error(e?.response?.data?.detail || 'No se pudo registrar');
        } finally {
            setGuardando(false);
        }
    };

    const quitar = async (fila) => {
        try {
            await borrarIncidencia(fila.pin, fila.id);
            message.success('Incidencia eliminada');
            await cargar();
        } catch {
            message.error('No se pudo eliminar');
        }
    };

    const columnasPersonas = [
        {
            title: 'Persona',
            key: 'nombre',
            render: (_, f) => (
                <>
                    <Text style={{ fontSize: 13 }}>{f.nombre?.trim() || f.pin}</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        {f.departamento || `PIN ${f.pin}`}
                    </Text>
                </>
            ),
        },
        {
            title: 'Vínculo',
            dataIndex: 'vinculo',
            key: 'vinculo',
            width: 180,
            render: (v) => (v ? <Tag color={COLOR_VINCULO[v] ?? 'default'}>{v}</Tag> : '—'),
        },
    ];

    const columnasIncidencias = [
        { title: 'Persona', dataIndex: 'nombre', key: 'nombre', render: (v, f) => v?.trim() || f.pin },
        {
            title: 'Tipo',
            dataIndex: 'nombre_tipo',
            key: 'tipo',
            width: 160,
            render: (v, f) => <Tag color={tiposIncidencia.color[f.tipo] ?? 'default'}>{v}</Tag>,
        },
        {
            title: 'Periodo',
            key: 'periodo',
            width: 200,
            render: (_, f) => (f.desde === f.hasta ? fecha(f.desde) : `${fecha(f.desde)} — ${fecha(f.hasta)}`),
        },
        { title: 'Días', dataIndex: 'dias', key: 'dias', width: 70, align: 'right' },
        { title: 'Nota', dataIndex: 'nota', key: 'nota', responsive: ['lg'] },
        ...(puedeEditar ? [{
            title: '',
            key: 'acciones',
            width: 50,
            render: (_, f) => (
                <Popconfirm title="¿Eliminar?" onConfirm={() => quitar(f)}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        }] : []),
    ];

    return (
        <div>
            <PageHeading
                icon={<CalendarOutlined />}
                title="Vacaciones e incidencias"
                description="Días que no cuentan como hábiles: vacaciones, permisos, económicos, incapacidades y asuetos"
            />

            {!puedeEditar && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Puedes consultar, pero no registrar"
                    description="Registrar incidencias necesita el rol «Vine - editar ficha del personal»."
                />
            )}

            {puedeEditar && (
                <Card size="small" title="Registrar en varias personas a la vez" style={{ marginBottom: 16 }}>
                    <Form form={form} layout="vertical" size="small" onFinish={aplicar}>
                        <Row gutter={12}>
                            <Col xs={24} md={5}>
                                <Form.Item name="tipo" label="Tipo" rules={[{ required: true, message: 'Elige el tipo' }]}>
                                    <Select placeholder="Vacaciones, permiso…" options={tiposIncidencia.opciones} loading={tiposIncidencia.cargando} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={7}>
                                <Form.Item name="rango" label="Periodo" rules={[{ required: true, message: 'Elige las fechas' }]}>
                                    <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="nota" label="Nota">
                                    <Input placeholder="Periodo vacacional de fin de año…" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={4}>
                                <Form.Item label=" ">
                                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={guardando} block>
                                        Aplicar
                                    </Button>
                                </Form.Item>
                            </Col>
                        </Row>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {seleccion.length
                                ? `Se aplicará a las ${seleccion.length} personas seleccionadas.`
                                : `Sin selección se aplica a las ${candidatos.length} personas de la lista.`}
                        </Text>
                    </Form>
                </Card>
            )}

            <Row gutter={[16, 16]}>
                <Col xs={24} xl={9}>
                    <Card
                        size="small"
                        title="A quién"
                        extra={(
                            <Select
                                allowClear
                                size="small"
                                style={{ width: 190 }}
                                placeholder="Todos los vínculos"
                                value={vinculo}
                                onChange={(v) => { setVinculo(v ?? null); setSeleccion([]); }}
                                options={vinculos}
                            />
                        )}
                    >
                        <Table
                            size="small"
                            rowKey="pin"
                            loading={cargando}
                            columns={columnasPersonas}
                            dataSource={candidatos}
                            pagination={{ pageSize: 10, size: 'small', showTotal: (t) => `${t} personas` }}
                            rowSelection={puedeEditar ? {
                                selectedRowKeys: seleccion,
                                onChange: setSeleccion,
                            } : undefined}
                        />
                    </Card>
                </Col>
                <Col xs={24} xl={15}>
                    <Card size="small" title="Lo registrado">
                        <Table
                            size="small"
                            rowKey="id"
                            loading={cargando}
                            columns={columnasIncidencias}
                            dataSource={incidencias}
                            pagination={{ pageSize: 15, size: 'small', showTotal: (t) => `${t} incidencias` }}
                            locale={{ emptyText: 'Todavía no hay incidencias registradas' }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default IncidenciasPage;
