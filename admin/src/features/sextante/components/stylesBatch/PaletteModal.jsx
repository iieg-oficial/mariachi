import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Modal, Segmented, Space, Spin, Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined, BgColorsOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { fetchPalettes } from '@features/mapalab-layers/hooks/useSldEditor';
import { classCount, severityOf } from '@features/sextante/utils/stylesBatchTable';
import ColorRamp from './ColorRamp';
import CustomRamp from './CustomRamp';
import PaletteFile, { PALETTE_FILE } from './PaletteFile';
import { PaletteGrid, PaletteTile } from './PaletteTile';

const { Text } = Typography;

const SEVERITIES = [
    { value: 'SENSIBLE', label: 'Sensible' },
    { value: 'COMPARATIVA', label: 'Comparativa' },
    { value: 'CRITICA', label: 'Crítica' },
];

const TITLES = { propia: 'Colores personalizados', archivo: 'Cargar de archivo' };

const familyName = (name) => name
    .replace(/^S_/, '')
    .replace(/_(\d+|\/)_(SENSIBLE|COMPARATIVA|CRITICA)$/, '')
    .replace(/^D_\d+_/, '')
    .replaceAll('_S_', ' · ')
    .replaceAll('_', ' ')
    .toLowerCase();

export default function PaletteModal({ row, onPick, onClose }) {
    const [palettes, setPalettes] = useState(null);
    const [severity, setSeverity] = useState(severityOf(row?.paleta));
    const [mode, setMode] = useState(row?.colores_propios ? 'propia' : 'catalogo');
    const [custom, setCustom] = useState(() => (row?.colores_propios ? row.colores : []));
    const [customKey, setCustomKey] = useState(0);
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        fetchPalettes().then(setPalettes).catch(() => setPalettes([]));
    }, []);

    const classes = row ? classCount(row.cortes_texto) : 0;
    const diverging = row?.orientacion === 'Central';

    const options = useMemo(() => (palettes || []).filter((palette) => {
        if (palette.colors.length < classes) return false;
        if (diverging) return palette.tipo === 'divergente';
        return palette.tipo !== 'divergente' && palette.name.endsWith(`_${severity}`)
            && (palette.n_classes === null || palette.n_classes === classes);
    }), [palettes, classes, diverging, severity]);

    const openCustom = (colors) => {
        setCustom(colors);
        setCustomKey((k) => k + 1);
        setMode('propia');
    };

    const drop = (event) => {
        event.preventDefault();
        setDragging(false);
        const dropped = event.dataTransfer?.files?.[0];
        if (!dropped) return;
        if (!PALETTE_FILE.test(dropped.name)) {
            message.error('Suelta un Excel (.xlsx) o un CSV');
            return;
        }
        setFile(dropped);
        setMode('archivo');
    };

    const dropZone = {
        onDragOver: (event) => {
            event.preventDefault();
            setDragging(true);
        },
        onDragLeave: (event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        },
        onDrop: drop,
    };

    const catalog = (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                {diverging
                    ? <Text type="secondary">Dos lados</Text>
                    : <Segmented options={SEVERITIES} value={severity} onChange={setSeverity} />}
                <Tooltip title="Crear una paleta personalizada">
                    <Button
                        shape="circle"
                        icon={<BgColorsOutlined />}
                        aria-label="Crear una paleta personalizada"
                        onClick={() => openCustom(row?.colores || [])}
                    />
                </Tooltip>
            </div>
            {palettes === null && <Spin />}
            {palettes !== null && options.length === 0 && (
                <Empty description={`No hay colores de ${classes} clases con esa severidad`} />
            )}
            <PaletteGrid>
                {options.map((palette) => (
                    <PaletteTile
                        key={palette.name}
                        label={familyName(palette.name)}
                        selected={!row?.colores_propios && palette.name === row?.paleta}
                        onClick={() => onPick({ paleta: palette.name, colores_propios: '' })}
                    >
                        <ColorRamp colors={palette.colors.slice(0, classes)} stretch />
                    </PaletteTile>
                ))}
            </PaletteGrid>
            <Text type="secondary">Para usar tus paletas, arrastra aquí su tabla (CSV o Excel).</Text>
        </>
    );

    const title = mode === 'catalogo'
        ? row?.nombre
        : (
            <Space>
                <Button type="text" size="small" icon={<ArrowLeftOutlined />} aria-label="Volver al catálogo" onClick={() => setMode('catalogo')} />
                {TITLES[mode]}
            </Space>
        );

    return (
        <Modal open={Boolean(row)} title={title} footer={null} onCancel={onClose} width={720} destroyOnHidden>
            <div
                {...dropZone}
                data-testid="palette-drop"
                style={{
                    display: 'grid',
                    gap: 16,
                    borderRadius: 8,
                    outline: dragging ? '2px dashed var(--ant-color-primary)' : 'none',
                    outlineOffset: 6,
                }}
            >
                {mode === 'catalogo' && catalog}
                {mode === 'propia' && <CustomRamp key={customKey} initial={custom} classes={classes} onPick={onPick} />}
                {mode === 'archivo' && file && <PaletteFile file={file} classes={classes} onChoose={openCustom} />}
            </div>
        </Modal>
    );
}
