import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Modal, Segmented, Space, Spin, Typography } from 'antd';
import { ArrowLeftOutlined, BgColorsOutlined, UploadOutlined } from '@ant-design/icons';
import { fetchPalettes } from '@features/mapalab-layers/hooks/useSldEditor';
import { classCount, severityOf } from '@features/sextante/utils/stylesBatchTable';
import ColorRamp from './ColorRamp';
import CustomRamp from './CustomRamp';
import PaletteFile from './PaletteFile';
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

    const catalog = (
        <>
            <Space wrap>
                {diverging
                    ? <Text type="secondary">Dos lados</Text>
                    : <Segmented options={SEVERITIES} value={severity} onChange={setSeverity} />}
                <Text type="secondary">{classes} colores</Text>
            </Space>
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
            <Space wrap>
                <Button shape="round" icon={<BgColorsOutlined />} onClick={() => openCustom(row?.colores || [])}>
                    Crear personalizada
                </Button>
                <Button shape="round" icon={<UploadOutlined />} onClick={() => setMode('archivo')}>
                    Cargar de archivo
                </Button>
            </Space>
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
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                {mode === 'catalogo' && catalog}
                {mode === 'propia' && <CustomRamp key={customKey} initial={custom} classes={classes} onPick={onPick} />}
                {mode === 'archivo' && <PaletteFile classes={classes} onChoose={openCustom} />}
            </Space>
        </Modal>
    );
}
