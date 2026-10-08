import { useEffect, useState } from 'react';
import { Button, Input, Segmented, Space, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import CategoryIcon from '@features/mapalab-symbols/components/CategoryIcon';
import SymbolPicker from '@features/mapalab-symbols/components/SymbolPicker';
import { isIconUrl } from '@features/mapalab-symbols/utils/categoryIcon';

const { Text } = Typography;

const MODES = [
    { label: 'Emoji o texto', value: 'texto' },
    { label: 'Del catálogo', value: 'catalogo' },
];

export default function CategoryIconField({ value, onChange }) {
    const [mode, setMode] = useState(isIconUrl(value) ? 'catalogo' : 'texto');
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        setMode(isIconUrl(value) ? 'catalogo' : 'texto');
    }, [value]);

    const handleSymbol = (symbolId, symbol) => {
        setSelectedId(symbolId);
        onChange?.(symbol.kind === 'emoji' ? symbol.value : (symbol.imageUrl || symbol.image_url));
    };

    return (
        <Space orientation="vertical" style={{ width: '100%' }} size={8}>
            <Space align="center" wrap>
                <Segmented options={MODES} value={mode} onChange={setMode} size="small" />
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        border: '1px solid #f0f0f0',
                        borderRadius: 6,
                        background: '#fafafa',
                    }}
                >
                    <CategoryIcon icon={value} size={20} />
                </span>
                {value && (
                    <Button
                        size="small"
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => { setSelectedId(null); onChange?.(''); }}
                    >
                        Quitar
                    </Button>
                )}
            </Space>

            {mode === 'texto' ? (
                <Input
                    placeholder="😀"
                    maxLength={8}
                    value={isIconUrl(value) ? '' : (value || '')}
                    onChange={(e) => onChange?.(e.target.value)}
                />
            ) : (
                <SymbolPicker
                    value={selectedId}
                    onChange={handleSymbol}
                    hint={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Los símbolos de imagen y SVG se guardan como URL del Acervo; los emoji, como carácter.
                        </Text>
                    }
                />
            )}
        </Space>
    );
}
