import { useEffect, useState } from 'react';
import { Checkbox, Empty, Space, Typography } from 'antd';
import useIsMobile from '@shared/hooks/useIsMobile';
import { clearPreviewCache, previewKey, usePreviewCache } from '@features/sextante/hooks/useStylePreview';
import { PreviewPanel } from './PreviewCard';

const { Text } = Typography;

const LIST_STYLE = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2, maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' };

const itemStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 8,
    background: active ? 'var(--ant-color-primary-bg)' : 'transparent',
});

const dotStyle = (ready) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    flex: 'none',
    border: '1.5px solid var(--ant-color-success)',
    background: ready ? 'var(--ant-color-success)' : 'transparent',
});

export default function PreviewStep({ rows }) {
    const { isMobile } = useIsMobile();
    const [selected, setSelected] = useState(() => (rows.length ? [rows[0].fila] : []));
    const isCached = usePreviewCache();

    useEffect(() => clearPreviewCache, []);

    const toggle = (fila, checked) => setSelected((prev) => (
        checked ? [...prev, fila] : prev.filter((f) => f !== fila)
    ));

    const ready = (row) => isCached(previewKey(row.alias, row.layer_name, row))
        && (!row.reemplaza || isCached(previewKey(row.alias, row.layer_name, null)));

    const shown = rows.filter((row) => selected.includes(row.fila));

    return (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 300px) minmax(0, 1fr)', gap: 16 }}>
            <Space orientation="vertical" size={8}>
                <Text strong>{rows.length} estilos</Text>
                <ul style={LIST_STYLE}>
                    {rows.map((row) => {
                        const active = selected.includes(row.fila);
                        return (
                            <li key={row.fila} style={itemStyle(active)}>
                                <Checkbox
                                    checked={active}
                                    onChange={(e) => toggle(row.fila, e.target.checked)}
                                    aria-label={`Agregar ${row.nombre}`}
                                />
                                <Text
                                    ellipsis={{ tooltip: row.nombre }}
                                    style={{ flex: 1, cursor: 'pointer' }}
                                    onClick={() => setSelected([row.fila])}
                                >
                                    {row.nombre}
                                </Text>
                                <span style={dotStyle(ready(row))} aria-label={ready(row) ? 'Ya cargado' : 'Sin cargar'} />
                            </li>
                        );
                    })}
                </ul>
            </Space>
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                {shown.length === 0 && <Empty description="Elige un estilo de la lista" />}
                {shown.map((row) => <PreviewPanel key={row.fila} row={row} />)}
            </Space>
        </div>
    );
}
