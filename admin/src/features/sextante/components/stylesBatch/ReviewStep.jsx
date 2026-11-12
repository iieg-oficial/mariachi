import { useState } from 'react';
import { Button, Segmented, Space, Table, Tooltip } from 'antd';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { ORIENTATIONS, classCount } from '@features/sextante/utils/stylesBatchTable';
import ColorRamp from './ColorRamp';
import OrientationHelp from './OrientationHelp';
import PaletteModal from './PaletteModal';
import { CutsCell, GeoserverCell, SeverityCell, StatusCell, TextCell } from './ReviewCells';

const CUTS_TIP = 'Repite el primer corte (0, 0, …) para que el cero tenga su color. Escribe «y menos» al principio o «y más» al final para dejar abierta la primera o la última clase.';
const STATUS_TIP = 'Nuevo: el estilo no existe y se crea. Reemplaza: ya existe y se sobrescribe al publicar. En rojo: algo que corregir antes de seguir.';

const withTip = (label, tip, ariaLabel = tip) => (
    <Space size={4}>
        {label}
        <Tooltip title={tip}><InfoCircleOutlined aria-label={ariaLabel} /></Tooltip>
    </Space>
);

export default function ReviewStep({ rows, checkingRows, onChangeRow, onRemoveRows, scrollY = 'calc(100vh - 400px)' }) {
    const [paletteRow, setPaletteRow] = useState(null);

    const change = (row, changes) => onChangeRow(row.fila, changes);

    const columns = [
        {
            title: 'Capa',
            key: 'capa',
            width: 220,
            render: (_, row) => <TextCell value={row.nombre} label="nombre" onChange={(nombre) => change(row, { nombre })} />,
        },
        {
            title: 'Capa en GeoServer',
            key: 'geoserver',
            width: 240,
            render: (_, row) => <GeoserverCell row={row} onChange={(changes) => change(row, changes)} />,
        },
        {
            title: 'Campo',
            key: 'campo',
            width: 150,
            render: (_, row) => <TextCell value={row.attribute} label="campo" mono onChange={(attribute) => change(row, { attribute })} />,
        },
        {
            title: 'Unidades',
            key: 'unidades',
            width: 170,
            render: (_, row) => <TextCell value={row.unidades} label="unidades" onChange={(unidades) => change(row, { unidades })} />,
        },
        {
            title: 'Paleta',
            key: 'paleta',
            width: 170,
            render: (_, row) => (
                <Tooltip title={row.paleta || 'Colores propios'}>
                    <Button size="small" onClick={() => setPaletteRow(row)} aria-label="Elegir colores">
                        {row.colores.length ? <ColorRamp colors={row.colores} /> : 'Elegir…'}
                    </Button>
                </Tooltip>
            ),
        },
        { title: 'Tipo', key: 'tipo', width: 110, render: (_, row) => row.tipo || '—' },
        { title: 'Clases', key: 'clases', width: 80, align: 'center', render: (_, row) => classCount(row.cortes_texto) },
        { title: 'Severidad', key: 'severidad', width: 130, render: (_, row) => <SeverityCell row={row} /> },
        {
            title: withTip('Mejor', <OrientationHelp />, 'Qué es mejor'),
            key: 'orientacion',
            width: 150,
            render: (_, row) => (
                <Segmented
                    size="small"
                    value={row.orientacion}
                    onChange={(value) => change(row, { orientacion: value })}
                    options={ORIENTATIONS.map((o) => ({
                        value: o.value,
                        label: <Tooltip title={o.label}><span aria-label={o.label}>{o.icon}</span></Tooltip>,
                    }))}
                />
            ),
        },
        {
            title: withTip('Cortes', CUTS_TIP),
            key: 'cortes',
            width: 280,
            render: (_, row) => <CutsCell row={row} onChange={(text) => change(row, { cortes_texto: text })} />,
        },
        {
            title: withTip('Estado', STATUS_TIP),
            key: 'estado',
            width: 200,
            render: (_, row) => <StatusCell row={row} checking={checkingRows.includes(row.fila)} />,
        },
        onRemoveRows && {
            title: '',
            key: 'quitar',
            width: 48,
            render: (_, row) => (
                <Tooltip title="Quitar fila">
                    <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`Quitar ${row.nombre}`}
                        onClick={() => onRemoveRows([row.fila])}
                    />
                </Tooltip>
            ),
        },
    ].filter(Boolean);

    return (
        <>
            <Table
                rowKey="fila"
                size="middle"
                columns={columns}
                dataSource={rows}
                pagination={false}
                sticky
                scroll={{ x: 'max-content', y: scrollY || undefined }}
            />
            {paletteRow && (
                <PaletteModal
                    key={paletteRow.fila}
                    row={paletteRow}
                    onClose={() => setPaletteRow(null)}
                    onPick={(changes) => {
                        onChangeRow(paletteRow.fila, changes);
                        setPaletteRow(null);
                    }}
                />
            )}
        </>
    );
}
