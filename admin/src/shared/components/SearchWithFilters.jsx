import { Badge, Button, Input, Popover, Tooltip, Typography } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

const PANEL = { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 240 };

export function FilterField({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
            {children}
        </div>
    );
}

export default function SearchWithFilters({
    value,
    onChange,
    placeholder,
    ariaLabel,
    filters,
    activeFilters = 0,
    width = 440,
    onClearFilters,
}) {
    const panel = (
        <div style={PANEL}>
            {filters}
            {activeFilters > 0 && onClearFilters && (
                <Button size="small" shape="round" onClick={onClearFilters}>Quitar filtros</Button>
            )}
        </div>
    );

    return (
        <Input
            allowClear
            prefix={<SearchOutlined />}
            suffix={(
                <Popover trigger="click" placement="bottomRight" content={panel} arrow={false}>
                    <Tooltip title={activeFilters ? `${activeFilters} filtro(s) activo(s)` : 'Filtrar'}>
                        <Badge dot={activeFilters > 0} offset={[-4, 4]}>
                            <Button
                                type={activeFilters ? 'link' : 'text'}
                                size="small"
                                shape="circle"
                                icon={<FilterOutlined />}
                                aria-label="Filtrar"
                            />
                        </Badge>
                    </Tooltip>
                </Popover>
            )}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={ariaLabel || placeholder}
            style={{ borderRadius: 999, width }}
        />
    );
}
