import { SaveOutlined } from '@ant-design/icons';
import { App, Button, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useFullscreenHeader } from '@app/fullscreenHeader';
import { getPersonal, guardarFicha } from '@features/vine/api/vineService';
import { colorAvatar, iniciales } from '@features/vine/components/columnasPersonal';
import { COLOR_VINCULO } from '@features/vine/constants';

const { Text } = Typography;

const VINCULOS = Object.keys(COLOR_VINCULO).map((v) => ({ value: v, label: v }));
const HORARIOS = [
    { value: '8-16', label: '8 a 4' },
    { value: '9-17', label: '9 a 5' },
    { value: 'otro', label: 'Sin horario fijo' },
];

const EDITABLES = ['nombre', 'departamento', 'puesto', 'vinculo', 'horario', 'email', 'telefono'];

const PersonalGridPage = () => {
    const { message } = App.useApp();
    const [filas, setFilas] = useState([]);
    const [cambios, setCambios] = useState({});
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setFilas(await getPersonal(365, true));
            setCambios({});
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const editar = (pin, campo, valor) => setCambios((prev) => ({
        ...prev,
        [pin]: { ...prev[pin], [campo]: valor },
    }));

    const pendientes = Object.keys(cambios).length;

    const guardar = useCallback(async () => {
        setGuardando(true);
        const entradas = Object.entries(cambios);
        let fallidos = 0;
        for (const [pin, datos] of entradas) {
            try {
                await guardarFicha(pin, datos);
            } catch {
                fallidos += 1;
            }
        }
        setGuardando(false);
        if (fallidos) message.error(`${fallidos} de ${entradas.length} no se pudieron guardar`);
        else message.success(`${entradas.length} fichas guardadas`);
        await cargar();
    }, [cambios, cargar, message]);

    useFullscreenHeader({
        title: 'Vine · captura masiva del personal',
        backTo: '/vine/personal',
        extra: (
            <Space>
                {pendientes > 0 && (
                    <Text style={{ color: '#fff', fontSize: 12 }}>{`${pendientes} sin guardar`}</Text>
                )}
                <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    disabled={!pendientes}
                    loading={guardando}
                    onClick={guardar}
                >
                    Guardar
                </Button>
            </Space>
        ),
    });

    const valor = (fila, campo) => cambios[fila.pin]?.[campo] ?? fila[campo] ?? undefined;
    const tocado = (fila, campo) => cambios[fila.pin]?.[campo] !== undefined;

    const celdaTexto = (campo) => (_, fila) => (
        <Input
            size="small"
            value={valor(fila, campo) ?? ''}
            status={tocado(fila, campo) ? 'warning' : undefined}
            onChange={(e) => editar(fila.pin, campo, e.target.value)}
        />
    );

    const celdaSelect = (campo, options) => (_, fila) => (
        <Select
            size="small"
            allowClear
            style={{ width: '100%' }}
            value={valor(fila, campo)}
            status={tocado(fila, campo) ? 'warning' : undefined}
            options={options}
            onChange={(v) => editar(fila.pin, campo, v ?? null)}
        />
    );

    const columnas = [
        {
            title: 'Persona',
            key: 'persona',
            fixed: 'left',
            width: 230,
            render: (_, f) => (
                <Space size={8}>
                    <span
                        style={{
                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                            background: colorAvatar(f.pin), color: '#fff', fontSize: 11,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        {iniciales(f.nombre, f.pin)}
                    </span>
                    <span>
                        <Text style={{ fontSize: 12 }}>{f.nombre?.trim() || f.pin}</Text>
                        {f.vinculo === 'Baja' && <Tag color="red" style={{ marginLeft: 6 }}>baja</Tag>}
                    </span>
                </Space>
            ),
        },
        { title: 'Nombre', key: 'nombre', width: 200, render: celdaTexto('nombre') },
        { title: 'Área', key: 'departamento', width: 200, render: celdaTexto('departamento') },
        { title: 'Puesto', key: 'puesto', width: 170, render: celdaTexto('puesto') },
        { title: 'Vínculo', key: 'vinculo', width: 180, render: celdaSelect('vinculo', VINCULOS) },
        { title: 'Horario', key: 'horario', width: 140, render: celdaSelect('horario', HORARIOS) },
        { title: 'Correo', key: 'email', width: 220, render: celdaTexto('email') },
        { title: 'Teléfono', key: 'telefono', width: 150, render: celdaTexto('telefono') },
    ];

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return filas;
        return filas.filter((f) => `${f.nombre ?? ''} ${f.pin} ${f.departamento ?? ''}`
            .toLowerCase().includes(q));
    }, [filas, busqueda]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 12, gap: 8 }}>
            <Space>
                <Input.Search
                    allowClear
                    placeholder="Buscar persona"
                    style={{ width: 280 }}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {`${visibles.length} personas · lo editado aquí no lo pisa el sincronizador`}
                </Text>
            </Space>
            <div style={{ flex: 1, minHeight: 0 }}>
                <Table
                    size="small"
                    rowKey="pin"
                    loading={cargando}
                    columns={columnas}
                    dataSource={visibles}
                    pagination={false}
                    scroll={{ x: 1400, y: 'calc(100vh - 160px)' }}
                />
            </div>
        </div>
    );
};

export default PersonalGridPage;
