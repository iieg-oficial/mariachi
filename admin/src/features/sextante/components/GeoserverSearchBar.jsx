import { Input, Segmented } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export default function GeoserverSearchBar({ isMobile, search, onSearchChange, scoped, onScopedChange, scopeName }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder={scoped && scopeName ? `Buscar en ${scopeName}` : 'Buscar en todos los recursos'}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{ width: isMobile ? '100%' : 280 }}
            />
            {scopeName && (
                <Segmented
                    size="small"
                    shape="round"
                    value={scoped ? 'aqui' : 'todo'}
                    onChange={(value) => onScopedChange(value === 'aqui')}
                    options={[
                        { value: 'todo', label: 'Todo' },
                        { value: 'aqui', label: scopeName },
                    ]}
                />
            )}
        </div>
    );
}
