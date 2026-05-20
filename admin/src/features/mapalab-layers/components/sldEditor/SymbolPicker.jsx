import { useEffect, useMemo, useState } from 'react';
import { Empty, Segmented, Spin, Tag } from 'antd';
import {
    listCategories,
    listSymbols,
} from '@features/mapalab-symbols/api/symbolsService';
import SymbolPreview from '@features/mapalab-symbols/components/SymbolPreview';


export default function SymbolPicker({ value, onChange }) {
    const [categories, setCategories] = useState([]);
    const [loadingCats, setLoadingCats] = useState(true);
    const [activeCategoryId, setActiveCategoryId] = useState(null);
    const [symbols, setSymbols] = useState([]);
    const [loadingSyms, setLoadingSyms] = useState(false);

    useEffect(() => {
        let cancelled = false;
        listCategories()
            .then((items) => {
                if (cancelled) return;
                setCategories(items);
                if (items.length) {
                    setActiveCategoryId((prev) => (prev == null ? items[0].id : prev));
                }
            })
            .finally(() => { if (!cancelled) setLoadingCats(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (activeCategoryId == null) {
            setSymbols([]);
            return undefined;
        }
        let cancelled = false;
        setLoadingSyms(true);
        listSymbols(activeCategoryId)
            .then((items) => { if (!cancelled) setSymbols(items); })
            .finally(() => { if (!cancelled) setLoadingSyms(false); });
        return () => { cancelled = true; };
    }, [activeCategoryId]);

    const segmentedOptions = useMemo(
        () => categories.map((c) => ({ label: `${c.icon || ''} ${c.name}`.trim(), value: c.id })),
        [categories],
    );

    if (loadingCats) return <div style={{ textAlign: 'center', padding: 12 }}><Spin size="small" /></div>;
    if (!categories.length) return <Empty description="Sin categorías. Crea categorías en MapaLab → Símbolos." />;

    return (
        <div>
            <Segmented
                options={segmentedOptions}
                value={activeCategoryId}
                onChange={setActiveCategoryId}
                size="small"
                style={{ marginBottom: 8, maxWidth: '100%', overflowX: 'auto' }}
            />
            {loadingSyms ? (
                <div style={{ textAlign: 'center', padding: 12 }}><Spin size="small" /></div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
                        gap: 6,
                        maxHeight: 260,
                        overflowY: 'auto',
                    }}
                >
                    {symbols.map((sym) => {
                        const selected = value === sym.id;
                        return (
                            <button
                                key={sym.id}
                                type="button"
                                onClick={() => onChange?.(sym.id, sym)}
                                title={sym.name || sym.value || ''}
                                style={{
                                    padding: 6,
                                    border: selected ? '2px solid #fa8c16' : '1px solid #f0f0f0',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 48,
                                }}
                            >
                                <SymbolPreview symbol={sym} size={28} />
                            </button>
                        );
                    })}
                </div>
            )}
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                <Tag color="blue" style={{ fontSize: 10 }}>emoji</Tag>,{' '}
                <Tag color="green" style={{ fontSize: 10 }}>image</Tag> y{' '}
                <Tag color="purple" style={{ fontSize: 10 }}>svg</Tag> soportados en SLD.
            </div>
        </div>
    );
}
