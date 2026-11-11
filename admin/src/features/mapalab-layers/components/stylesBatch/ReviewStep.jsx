import { useState } from 'react';
import { Button, Segmented, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { ORIENTATIONS, classCount } from '@features/mapalab-layers/utils/stylesBatchTable';
import ColorRamp from './ColorRamp';
import PaletteModal from './PaletteModal';
import { CutsCell, LayerCell, StatusCell } from './ReviewCells';

const { Text } = Typography;

const CUTS_TIP = 'Repite el primer corte (0, 0, …) para que el cero tenga su color. Escribe «y menos» al principio o «y más» al final para dejar abierta la primera o la última clase.';
const BETTER_TIP = ORIENTATIONS.map((o) => `${o.icon} ${o.label}`).join(' · ');

const withTip = (label, tip) => (
    <Space size={4}>
        {label}
        <Tooltip title={tip}><InfoCircleOutlined aria-label={tip} /></Tooltip>
    </Space>
);

export default function ReviewStep({ rows, checkingRows, onChangeRow, onRemoveRows }) {
    const [paletteRow, setPaletteRow] = useState(null);
    const withErrors = rows.filter((row) => row.errores.length).map((row) => row.fila);

    const columns = [
        {
            title: 'Capa',
            key: 'capa',
            render: (_, row) => <LayerCell row={row} onChange={(changes) => onChangeRow(row.fila, changes)} />,
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
            title: withTip('Cortes', CUTS_TIP),
            key: 'cortes',
            render: (_, row) => <CutsCell row={row} onChange={(text) => onChangeRow(row.fila, { cortes_texto: text })} />,
        },
        {
            title: withTip('Mejor', BETTER_TIP),
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
        { title: 'Clases', key: 'clases', align: 'center', render: (_, row) => classCount(row.cortes_texto) },
        {
            title: '',
            key: 'estado',
            render: (_, row) => <StatusCell row={row} checking={checkingRows.includes(row.fila)} />,
        },
        {
            title: '',
            key: 'quitar',
            width: 48,
            render: (_, row) => (
                <Tooltip title="Quitar fila">
                    <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        aria-label={`Quitar ${row.nombre}`}
                        onClick={() => onRemoveRows([row.fila])}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
                <Text strong>{rows.length} estilos</Text>
                {withErrors.length > 0 && (
                    <>
                        <Tag color="error">{withErrors.length} por corregir</Tag>
                        <Button size="small" shape="round" onClick={() => onRemoveRows(withErrors)}>
                            Quitar las {withErrors.length} con error
                        </Button>
                    </>
                )}
            </Space>
            <Table
                rowKey="fila"
                size="middle"
                columns={columns}
                dataSource={rows}
                pagination={false}
                scroll={{ x: 960 }}
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
        </Space>
    );
}
