import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export default function GeoserverSearchBar({ isMobile, search, onSearchChange }) {
    return (
        <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar en todos los recursos"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: isMobile ? '100%' : 280 }}
        />
    );
}
