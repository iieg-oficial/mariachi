import { useEffect, useState } from 'react';
import { Button, Empty, Popover, Spin, Tooltip } from 'antd';
import { SmileOutlined } from '@ant-design/icons';
import { listSymbols } from '@features/mapalab-symbols/api/symbolsService';
import SymbolPreview from './SymbolPreview';

const cacheRef = { data: null, promise: null };

const loadEmojis = () => {
    if (cacheRef.data) return Promise.resolve(cacheRef.data);
    if (cacheRef.promise) return cacheRef.promise;
    cacheRef.promise = listSymbols()
        .then((all) => {
            const emojis = (all || []).filter((s) => s.kind === 'emoji' && s.value);
            cacheRef.data = emojis;
            cacheRef.promise = null;
            return emojis;
        })
        .catch((err) => {
            cacheRef.promise = null;
            throw err;
        });
    return cacheRef.promise;
};

export default function SymbolInsertButton({ disabled, onInsert, onMouseDown }) {
    const [open, setOpen] = useState(false);
    const [emojis, setEmojis] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || emojis !== null) return;
        setLoading(true);
        loadEmojis()
            .then(setEmojis)
            .catch(() => setEmojis([]))
            .finally(() => setLoading(false));
    }, [open, emojis]);

    const handleSelect = (value) => {
        onInsert?.(value);
        setOpen(false);
    };

    const content = (
        <div style={{ width: 240, maxHeight: 220, overflowY: 'auto' }}>
            {loading || emojis === null ? (
                <div style={{ textAlign: 'center', padding: 16 }}><Spin size="small" /></div>
            ) : emojis.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Sin emojis en el catálogo"
                    style={{ padding: 8 }}
                />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
                    {emojis.map((s) => (
                        <Tooltip key={s.id} title={s.name || s.value} mouseEnterDelay={0.5}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelect(s.value)}
                                aria-label={s.name || s.value}
                                style={{ background: 'transparent', border: '1px solid transparent', borderRadius: 4, padding: 4, cursor: 'pointer' }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = '#1677ff'; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <SymbolPreview symbol={s} size={20} />
                            </button>
                        </Tooltip>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            content={content}
            title="Insertar símbolo"
            trigger="click"
            placement="bottomLeft"
            destroyOnHidden
        >
            <Tooltip title="Símbolo del catálogo">
                <Button
                    size="small"
                    icon={<SmileOutlined />}
                    disabled={disabled}
                    onMouseDown={onMouseDown}
                    aria-label="Insertar símbolo"
                />
            </Tooltip>
        </Popover>
    );
}
