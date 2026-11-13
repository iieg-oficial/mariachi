import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export default function TreeSearchInput({ value, onChange, block = false }) {
    return (
        <Input
            size={block ? 'middle' : 'small'}
            placeholder="Buscar capa"
            prefix={<SearchOutlined />}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            allowClear
            aria-label="Buscar capa"
            style={{ width: block ? '100%' : 200 }}
        />
    );
}
