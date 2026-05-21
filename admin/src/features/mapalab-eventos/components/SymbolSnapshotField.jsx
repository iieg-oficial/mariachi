import { Button, Popover, Space, Tooltip, Typography } from 'antd';
import { CloseOutlined, SmileOutlined } from '@ant-design/icons';
import SymbolPicker from '@features/mapalab-layers/components/sldEditor/SymbolPicker';
import SymbolPreview from '@features/mapalab-symbols/components/SymbolPreview';

const { Text } = Typography;

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

const SymbolSnapshotField = ({ value, onChange, size = 28, placeholder = 'Sin símbolo' }) => {
    const handleSelect = (_symbolId, symbol) => {
        onChange?.(snapshotFromSymbol(symbol));
    };
    const handleClear = (e) => {
        e?.stopPropagation();
        onChange?.(null);
    };

    const symbolAsObject = value ? { ...value, image_url: value.imageUrl } : null;

    return (
        <Popover
            trigger="click"
            placement="bottomLeft"
            content={
                <div style={{ width: 320 }}>
                    <SymbolPicker value={value?.symbolId} onChange={handleSelect} />
                </div>
            }
        >
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
    );
};

export default SymbolSnapshotField;
