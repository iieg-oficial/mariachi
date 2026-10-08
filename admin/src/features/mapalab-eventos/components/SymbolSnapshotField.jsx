import { useState } from 'react';
import { Button, Input, Popover, Segmented, Space, Tooltip, Typography } from 'antd';
import { CloseOutlined, FileImageOutlined, SmileOutlined } from '@ant-design/icons';
import SymbolPicker from '@features/mapalab-symbols/components/SymbolPicker';
import SymbolPreview from '@features/mapalab-symbols/components/SymbolPreview';
import { BucketFilePicker } from '@features/acervo';
import { message } from '@shared/services/message';

const { Text } = Typography;

const ORIGENES = [
    { label: 'Emoji', value: 'emoji' },
    { label: 'Catálogo', value: 'catalogo' },
    { label: 'Acervo', value: 'acervo' },
];
const BUCKET_SLUGS = ['iieg'];

const snapshotFromSymbol = (symbol) => {
    if (!symbol) return null;
    return {
        symbolId: symbol.id ?? null,
        kind: symbol.kind,
        value: symbol.value ?? null,
        imageUrl: symbol.imageUrl || symbol.image_url || null,
        name: symbol.name ?? null,
    };
};

const origenDe = (value) => {
    if (!value || value.symbolId) return 'catalogo';
    return value.kind === 'emoji' ? 'emoji' : 'acervo';
};

const SymbolSnapshotField = ({ value, onChange, size = 28, placeholder = 'Sin símbolo' }) => {
    const [origen, setOrigen] = useState(() => origenDe(value));
    const [pickerOpen, setPickerOpen] = useState(false);

    const handleSelect = (_symbolId, symbol) => {
        onChange?.(snapshotFromSymbol(symbol));
    };
    const handleEmoji = (e) => {
        const emoji = e.target.value.trim();
        onChange?.(emoji ? { symbolId: null, kind: 'emoji', value: emoji, imageUrl: null, name: null } : null);
    };
    const handleAcervo = (file) => {
        if (!file?.url) {
            message.error('El archivo seleccionado no tiene URL pública');
            return;
        }
        onChange?.({ symbolId: null, kind: 'image', value: null, imageUrl: file.url, name: file.nombre || null });
        setPickerOpen(false);
    };
    const handleClear = (e) => {
        e?.stopPropagation();
        onChange?.(null);
    };

    const symbolAsObject = value ? { ...value, image_url: value.imageUrl } : null;
    const emojiLibre = value?.kind === 'emoji' && !value?.symbolId ? value.value : '';

    const content = (
        <div style={{ width: 320 }}>
            <Segmented block size="small" options={ORIGENES} value={origen} onChange={setOrigen} style={{ marginBottom: 10 }} />
            {origen === 'emoji' && (
                <Input placeholder="🦅" maxLength={8} value={emojiLibre} onChange={handleEmoji} aria-label="Emoji del símbolo" />
            )}
            {origen === 'catalogo' && <SymbolPicker value={value?.symbolId} onChange={handleSelect} />}
            {origen === 'acervo' && (
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Button icon={<FileImageOutlined />} onClick={() => setPickerOpen(true)} block>
                        Elegir imagen del Acervo
                    </Button>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        SVG o PNG en <code>iieg/iconos/</code>.
                    </Text>
                </Space>
            )}
        </div>
    );

    return (
        <>
            <Popover trigger="click" placement="bottomLeft" content={content}>
                <Button style={{ height: 'auto', padding: '4px 8px' }}>
                    <Space size={6}>
                        {symbolAsObject ? (
                            <SymbolPreview symbol={symbolAsObject} size={size} />
                        ) : (
                            <SmileOutlined style={{ fontSize: size, color: '#bfbfbf' }} />
                        )}
                        <Text type={symbolAsObject ? undefined : 'secondary'}>
                            {symbolAsObject?.name || symbolAsObject?.value || placeholder}
                        </Text>
                        {symbolAsObject && (
                            <Tooltip title="Quitar símbolo">
                                <Button
                                    size="small"
                                    type="text"
                                    icon={<CloseOutlined />}
                                    onClick={handleClear}
                                    aria-label="Quitar símbolo"
                                />
                            </Tooltip>
                        )}
                    </Space>
                </Button>
            </Popover>
            <BucketFilePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleAcervo}
                bucketSlugs={BUCKET_SLUGS}
                title="Elegir imagen del símbolo"
                uploadAccept="image/svg+xml,image/png,image/webp"
            />
        </>
    );
};

export default SymbolSnapshotField;
