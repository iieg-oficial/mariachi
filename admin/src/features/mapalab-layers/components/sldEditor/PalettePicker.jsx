import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, Select, Space, Spin, Switch, Tag, Typography } from 'antd';
import { fetchPalettes } from '@features/mapalab-layers/hooks/useSldEditor';

const { Text } = Typography;

const TIPO_LABEL = {
    secuencial: 'Secuencial',
    divergente: 'Divergente',
    comparativa: 'Comparativa',
    cualitativa: 'Cualitativa',
};

export default function PalettePicker({ colors = [], nClasses, onChange }) {
    const [palettes, setPalettes] = useState(null);
    const [search, setSearch] = useState('');
    const [filterByClasses, setFilterByClasses] = useState(true);
    const [tipoFilter, setTipoFilter] = useState([]);
    const [severidadFilter, setSeveridadFilter] = useState([]);

    useEffect(() => {
        let cancelled = false;
        fetchPalettes()
            .then((data) => { if (!cancelled) setPalettes(data); })
            .catch(() => { if (!cancelled) setPalettes([]); });
        return () => { cancelled = true; };
    }, []);

    const tipoOptions = useMemo(() => {
        const set = new Set((palettes || []).map((p) => p.tipo).filter(Boolean));
        return Array.from(set).map((t) => ({ value: t, label: TIPO_LABEL[t] || t }));
    }, [palettes]);

    const severidadOptions = useMemo(() => {
        const set = new Set((palettes || []).map((p) => p.severidad).filter(Boolean));
        return Array.from(set).map((s) => ({ value: s, label: s }));
    }, [palettes]);

    const filtered = useMemo(() => {
        if (!palettes) return [];
        const q = search.trim().toLowerCase();
        return palettes.filter((p) => {
            if (filterByClasses && nClasses && p.colors.length !== nClasses) return false;
            if (q && !p.name.toLowerCase().includes(q)) return false;
            if (tipoFilter.length && !tipoFilter.includes(p.tipo)) return false;
            if (severidadFilter.length && !severidadFilter.includes(p.severidad)) return false;
            return true;
        });
    }, [palettes, search, filterByClasses, nClasses, tipoFilter, severidadFilter]);

    const grouped = useMemo(() => {
        const groups = {};
        for (const p of filtered) {
            const key = p.tipo || 'otro';
            (groups[key] = groups[key] || []).push(p);
        }
        return Object.entries(groups);
    }, [filtered]);

    const applyPalette = (paletteName, reversed = false) => {
        const p = palettes?.find((x) => x.name === paletteName);
        if (!p) return;
        const next = reversed ? [...p.colors].reverse() : p.colors.slice();
        onChange?.(next);
    };

    if (palettes === null) return <Spin />;

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap size="small">
                <Input.Search
                    placeholder="Buscar paleta…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: 240 }}
                    allowClear
                />
                <Select
                    mode="multiple"
                    placeholder="Tipo"
                    value={tipoFilter}
                    onChange={setTipoFilter}
                    options={tipoOptions}
                    style={{ minWidth: 160 }}
                    allowClear
                />
                {severidadOptions.length > 0 && (
                    <Select
                        mode="multiple"
                        placeholder="Severidad"
                        value={severidadFilter}
                        onChange={setSeveridadFilter}
                        options={severidadOptions}
                        style={{ minWidth: 140 }}
                        allowClear
                    />
                )}
                <Space size={6}>
                    <Switch
                        size="small"
                        checked={filterByClasses}
                        onChange={setFilterByClasses}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Solo {nClasses} clases
                    </Text>
                </Space>
                <Tag>{filtered.length} paletas</Tag>
            </Space>

            <Space orientation="vertical" size="small" style={{ width: '100%', maxHeight: 360, overflow: 'auto', border: '1px solid #f0f0f0', padding: 8, borderRadius: 4 }}>
                {grouped.length === 0 ? (
                    <Empty description="Sin paletas que coincidan" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    grouped.map(([tipo, list]) => (
                        <div key={tipo}>
                            <Text strong style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {TIPO_LABEL[tipo] || tipo} ({list.length})
                            </Text>
                            <div style={{ marginTop: 4 }}>
                                {list.map((p) => (
                                    <PaletteRow
                                        key={p.name}
                                        palette={p}
                                        currentColors={colors}
                                        onApply={(reversed) => applyPalette(p.name, reversed)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </Space>

            <Text strong style={{ fontSize: 12 }}>Colores actuales:</Text>
            <ColorChips colors={colors} editable onChange={onChange} />
        </Space>
    );
}

function PaletteRow({ palette, currentColors, onApply }) {
    const isCurrent = currentColors.length === palette.colors.length
        && currentColors.every((c, i) => c?.toUpperCase() === palette.colors[i]?.toUpperCase());

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 6,
                borderRadius: 4,
                background: isCurrent ? '#FFF2E5' : 'transparent',
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 11, fontWeight: 600 }} ellipsis={{ tooltip: palette.name }}>
                    {palette.name}
                </Text>
                <div style={{ display: 'flex', gap: 1, marginTop: 4 }}>
                    {palette.colors.map((c, i) => (
                        <div key={i} style={{ width: 18, height: 18, background: c, border: '1px solid #fff' }} />
                    ))}
                </div>
                <Text type="secondary" style={{ fontSize: 10 }}>
                    {palette.tipo} · {palette.colors.length} clases
                </Text>
            </div>
            <Space size={4}>
                <Button type="link" size="small" onClick={() => onApply(false)} style={{ fontSize: 11, padding: 0 }}>
                    Aplicar
                </Button>
                <Text type="secondary" style={{ fontSize: 10 }}>·</Text>
                <Button type="link" size="small" onClick={() => onApply(true)} style={{ fontSize: 11, padding: 0 }}>
                    Invertir
                </Button>
            </Space>
        </div>
    );
}

function ColorChips({ colors, editable, onChange }) {
    const updateOne = (idx, value) => {
        const next = colors.slice();
        next[idx] = value;
        onChange?.(next);
    };
    return (
        <Space wrap size={4}>
            {colors.map((c, i) => (
                <input
                    key={i}
                    type="color"
                    value={c}
                    onChange={(e) => updateOne(i, e.target.value.toUpperCase())}
                    disabled={!editable}
                    style={{ width: 36, height: 28, padding: 0, border: '1px solid #d9d9d9', borderRadius: 3, cursor: 'pointer' }}
                    title={c}
                />
            ))}
        </Space>
    );
}
