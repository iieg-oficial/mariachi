import { Input, Badge, Button, Typography, Space } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function SearchBar({
    searchTerm,
    onSearchChange,
    showFilters,
    onToggleFilters,
    activeFiltersCount
}) {
    return (
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>
                    <SearchOutlined /> Buscador de Contenido
                </Title>
                <Badge count={activeFiltersCount} offset={[-5, 5]}>
                    <Button
                        icon={<FilterOutlined />}
                        onClick={onToggleFilters}
                    >
                        {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                    </Button>
                </Badge>
            </div>

            <Input
                size="large"
                placeholder="Buscar por título, descripción, slug o etiquetas..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                allowClear
            />
        </Space>
    );
}
