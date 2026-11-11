import { useEffect, useMemo, useState } from 'react';
import { Empty, Modal, Segmented, Space, Spin, Typography } from 'antd';
import { fetchPalettes } from '@features/mapalab-layers/hooks/useSldEditor';
import { classCount, severityOf } from '@features/mapalab-layers/utils/stylesBatchTable';
import ColorRamp from './ColorRamp';

const { Text } = Typography;

const SEVERITIES = [
    { value: 'SENSIBLE', label: 'Sensible' },
    { value: 'COMPARATIVA', label: 'Comparativa' },
    { value: 'CRITICA', label: 'Crítica' },
];

const tileStyle = (selected) => ({
    display: 'grid',
    gap: 6,
    padding: 8,
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 8,
    background: 'transparent',
    border: selected ? '2px solid var(--ant-color-primary)' : '1px solid var(--ant-color-border)',
});

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

    return (
        <Modal open={Boolean(row)} title={row?.nombre} footer={null} onCancel={onClose} width={720} destroyOnHidden>
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                    {options.map((palette) => (
                        <button
                            key={palette.name}
                            type="button"
                            aria-pressed={palette.name === row?.paleta}
                            style={tileStyle(palette.name === row?.paleta)}
                            onClick={() => onPick(palette.name)}
                        >
                            <ColorRamp colors={palette.colors.slice(0, classes)} stretch />
                            <Text style={{ fontSize: 12 }}>{familyName(palette.name)}</Text>
                        </button>
                    ))}
                </div>
            </Space>
        </Modal>
    );
}
