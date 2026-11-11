import { useEffect, useRef, useState } from 'react';
import { Button, Input, Segmented, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
    ORIENTATIONS,
    classCount,
    cutsForDisplay,
    hasZeroClass,
} from '@features/mapalab-layers/utils/stylesBatchTable';
import ColorRamp from './ColorRamp';
import PaletteModal from './PaletteModal';

const { Text } = Typography;

const CUTS_TIP = 'Repite el primer corte (0, 0, …) para que el cero tenga su color. Escribe «null» al principio o al final para dejar abierta la primera o la última clase.';
const BETTER_TIP = ORIENTATIONS.map((o) => `${o.icon} ${o.label}`).join(' · ');

function CutsCell({ row, onChange }) {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);
    if (editing) {
        return (
            <Input
                id={`cortes-${row.fila}`}
                ref={inputRef}
                defaultValue={row.cortes_texto}
                style={{ width: 240, fontFamily: 'monospace' }}
                aria-label="Cortes"
                onPressEnter={(e) => e.currentTarget.blur()}
                onBlur={(e) => {
                    setEditing(false);
                    if (e.target.value !== row.cortes_texto) onChange(e.target.value);
                }}
            />
        );
    }
    const zero = hasZeroClass(row.cortes_texto);
    return (
        <Button type="text" size="small" onClick={() => setEditing(true)} aria-label="Editar cortes" style={{ height: 'auto' }}>
            <Space size={4} wrap>
                {cutsForDisplay(row.cortes_texto).map((cut, index) => (
                    <Tag key={`${cut}-${index}`} color={zero && index === 0 ? 'blue' : undefined} style={{ marginInlineEnd: 0 }}>
                        {cut}
                    </Tag>
                ))}
            </Space>
        </Button>
    );
}

function StatusCell({ row }) {
    if (row.errores.length) return <Text type="danger">{row.errores[0]}</Text>;
    return row.reemplaza ? <Tag color="warning">Reemplaza</Tag> : <Tag color="success">Nuevo</Tag>;
}

export default function ReviewStep({ rows, checking, onChangeRow }) {
    const [paletteRow, setPaletteRow] = useState(null);
    const withErrors = rows.filter((row) => row.errores.length).length;

    const columns = [
        {
            title: 'Capa',
            key: 'capa',
            render: (_, row) => (
                <Space orientation="vertical" size={0}>
                    <Text>{row.nombre || '—'}</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>{row.layer_name}</Text>
                </Space>
            ),
        },
        {
            title: 'Colores',
            key: 'colores',
            render: (_, row) => (
                <Button size="small" onClick={() => setPaletteRow(row)} aria-label="Elegir colores">
                    {row.colores.length ? <ColorRamp colors={row.colores} /> : 'Elegir…'}
                </Button>
            ),
        },
        {
            title: (
                <Space size={4}>
                    Cortes
                    <Tooltip title={CUTS_TIP}><InfoCircleOutlined aria-label={CUTS_TIP} /></Tooltip>
                </Space>
            ),
            key: 'cortes',
            render: (_, row) => <CutsCell row={row} onChange={(text) => onChangeRow(row.fila, { cortes_texto: text })} />,
        },
        {
            title: (
                <Space size={4}>
                    Mejor
                    <Tooltip title={BETTER_TIP}><InfoCircleOutlined aria-label={BETTER_TIP} /></Tooltip>
                </Space>
            ),
            key: 'orientacion',
            render: (_, row) => (
                <Segmented
                    size="small"
                    value={row.orientacion}
                    onChange={(value) => onChangeRow(row.fila, { orientacion: value })}
                    options={ORIENTATIONS.map((o) => ({
                        value: o.value,
                        label: <Tooltip title={o.label}><span aria-label={o.label}>{o.icon}</span></Tooltip>,
                    }))}
                />
            ),
        },
        {
            title: 'Clases',
            key: 'clases',
            align: 'center',
            render: (_, row) => classCount(row.cortes_texto),
        },
        { title: '', key: 'estado', render: (_, row) => <StatusCell row={row} /> },
    ];

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
                <Text strong>{rows.length} estilos</Text>
                {withErrors > 0 && <Tag color="error">{withErrors} por corregir</Tag>}
            </Space>
            <Table
                rowKey="fila"
                size="middle"
                columns={columns}
                dataSource={rows}
                loading={checking}
                pagination={false}
                scroll={{ x: 900 }}
            />
            <PaletteModal
                row={paletteRow}
                onClose={() => setPaletteRow(null)}
                onPick={(name) => {
                    onChangeRow(paletteRow.fila, { paleta: name });
                    setPaletteRow(null);
                }}
            />
        </Space>
    );
}
