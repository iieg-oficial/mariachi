import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, InputNumber, Select, Space, Switch, Table, Typography, message } from 'antd';
import { getColumnas, saveColumnas } from '@features/mapalab-layers/api/columnasTablaService';

const { Text } = Typography;

const FORMATOS = [
    { value: '', label: 'Automático' },
    { value: 'entero', label: 'Entero' },
    { value: 'decimal', label: 'Decimal' },
    { value: 'moneda', label: 'Moneda' },
    { value: 'fecha', label: 'Fecha' },
    { value: 'texto', label: 'Texto' },
];

const FORMATO_SUGERIDO = {
    integer: 'entero',
    number: 'decimal',
    date: 'fecha',
};

const combinar = (campos, guardadas) => {
    const porNombre = new Map(guardadas.map(item => [item.columna, item]));
    const disponibles = (campos || []).filter(campo => campo.type !== 'geometry');

    const filas = disponibles.map((campo, indice) => {
        const guardada = porNombre.get(campo.name);
        porNombre.delete(campo.name);
        return {
            columna: campo.name,
            tipo: campo.type,
            alias: guardada?.alias || '',
            orden: Number.isFinite(guardada?.orden) ? guardada.orden : indice,
            visible: guardada ? guardada.visible !== false : true,
            formato: guardada?.formato || '',
        };
    });

    const huerfanas = Array.from(porNombre.values()).map(item => ({
        columna: item.columna,
        tipo: 'ausente',
        alias: item.alias || '',
        orden: Number.isFinite(item.orden) ? item.orden : 999,
        visible: item.visible !== false,
        formato: item.formato || '',
    }));

    return [...filas, ...huerfanas].sort((a, b) => a.orden - b.orden);
};

export default function ColumnasTablaSection({ layerKey, availableFields }) {
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!layerKey) return undefined;
        let cancelado = false;
        setCargando(true);
        getColumnas(layerKey)
            .then(guardadas => { if (!cancelado) setFilas(combinar(availableFields, guardadas)); })
            .catch(() => { if (!cancelado) setFilas(combinar(availableFields, [])); })
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, [availableFields, layerKey]);

    const parchear = useCallback((columna, parche) => {
        setFilas(previas => previas.map(fila => (fila.columna === columna ? { ...fila, ...parche } : fila)));
    }, []);

    const guardar = async () => {
        setGuardando(true);
        try {
            await saveColumnas(layerKey, filas.map((fila, indice) => ({
                columna: fila.columna,
                alias: fila.alias?.trim() || null,
                orden: indice,
                visible: fila.visible,
                formato: fila.formato || null,
            })));
            message.success('Columnas guardadas');
        } catch (error) {
            message.error(error?.response?.data?.detail || 'No se pudieron guardar las columnas');
        } finally {
            setGuardando(false);
        }
    };

    const mover = (indice, direccion) => {
        setFilas(previas => {
            const destino = indice + direccion;
            if (destino < 0 || destino >= previas.length) return previas;
            const siguientes = [...previas];
            [siguientes[indice], siguientes[destino]] = [siguientes[destino], siguientes[indice]];
            return siguientes.map((fila, posicion) => ({ ...fila, orden: posicion }));
        });
    };

    const columnas = useMemo(() => [
        {
            title: 'Columna',
            dataIndex: 'columna',
            width: 200,
            render: (valor, fila) => (
                <Space orientation="vertical" size={0}>
                    <Text code>{valor}</Text>
                    <Text type={fila.tipo === 'ausente' ? 'danger' : 'secondary'} style={{ fontSize: 11 }}>
                        {fila.tipo === 'ausente' ? 'ya no existe en la capa' : fila.tipo}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Alias',
            dataIndex: 'alias',
            render: (valor, fila) => (
                <Input
                    value={valor}
                    placeholder={fila.columna}
                    onChange={evento => parchear(fila.columna, { alias: evento.target.value })}
                />
            ),
        },
        {
            title: 'Formato',
            dataIndex: 'formato',
            width: 140,
            render: (valor, fila) => (
                <Select
                    value={valor}
                    style={{ width: '100%' }}
                    options={FORMATOS}
                    placeholder={FORMATO_SUGERIDO[fila.tipo] || 'texto'}
                    onChange={formato => parchear(fila.columna, { formato })}
                />
            ),
        },
        {
            title: 'Visible',
            dataIndex: 'visible',
            width: 80,
            render: (valor, fila) => (
                <Switch checked={valor} onChange={visible => parchear(fila.columna, { visible })} />
            ),
        },
        {
            title: 'Orden',
            width: 120,
            render: (_, fila, indice) => (
                <Space size={4}>
                    <Button size="small" disabled={indice === 0} onClick={() => mover(indice, -1)}>↑</Button>
                    <Button size="small" disabled={indice === filas.length - 1} onClick={() => mover(indice, 1)}>↓</Button>
                    <InputNumber size="small" min={0} max={999} value={indice} disabled style={{ width: 52 }} />
                </Space>
            ),
        },
    ], [filas.length, parchear]);

    if (!layerKey) return <Empty description="La capa no tiene feature type definido" />;

    return (
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
                Así se ve la capa en la tabla de datos del visor. Sin alias se muestra el nombre crudo
                de la base; una capa sin configurar funciona igual, en el orden que entrega el servicio.
            </Text>
            <Table
                size="small"
                rowKey="columna"
                loading={cargando}
                dataSource={filas}
                columns={columnas}
                pagination={false}
                scroll={{ y: 420 }}
            />
            <Button type="primary" loading={guardando} disabled={filas.length === 0} onClick={guardar}>
                Guardar columnas
            </Button>
        </Space>
    );
}
