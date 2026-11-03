import { Button, Dropdown, Space } from 'antd';
import {
    DownloadOutlined,
    FilterOutlined,
    HistoryOutlined,
    QuestionCircleOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { EXPORT_ITEMS } from '@shared/components/dataGrid/exportItems';

export const ALL_FILTER_VALUES = '__todos__';

export default function GridToolbar({
    isDesktop,
    saving,
    filterValue,
    onFilterChange,
    filterItems,
    filterLabel,
    filterOpen,
    onFilterOpenChange,
    onReload,
    onOpenShortcuts,
    onOpenHistory,
    onExport,
    exporting,
}) {
    return (
        <Space size={6} wrap={!isDesktop}>
            <Dropdown
                placement="bottomRight"
                trigger={['click']}
                open={filterOpen}
                onOpenChange={onFilterOpenChange}
                menu={{
                    items: filterItems,
                    selectable: true,
                    selectedKeys: [filterValue || ALL_FILTER_VALUES],
                    onClick: ({ key }) => {
                        onFilterChange(key === ALL_FILTER_VALUES ? null : key);
                        onFilterOpenChange?.(false);
                    },
                    style: { maxHeight: 320, overflowY: 'auto' },
                }}
            >
                <Button
                    size="small"
                    shape="round"
                    type={filterValue ? 'default' : 'text'}
                    icon={<FilterOutlined />}
                    title={`Filtrar por ${filterLabel.toLowerCase()}`}
                >
                    {filterValue || filterLabel}
                </Button>
            </Dropdown>

            <Dropdown
                placement="bottomRight"
                trigger={['click']}
                menu={{ items: EXPORT_ITEMS, onClick: ({ key }) => onExport(key) }}
            >
                <Button
                    size="small"
                    shape="round"
                    type="text"
                    icon={<DownloadOutlined />}
                    loading={exporting}
                    title="Descargar datos e historial de cambios"
                >
                    Descargar
                </Button>
            </Dropdown>

            <Button
                size="small"
                shape="circle"
                type="text"
                icon={<HistoryOutlined />}
                onClick={onOpenHistory}
                aria-label="Historial de cambios"
                title="Ver historial de cambios"
            />

            <Button
                size="small"
                shape="circle"
                type="text"
                icon={<ReloadOutlined />}
                onClick={onReload}
                disabled={saving}
                aria-label="Recargar"
                title="Recargar desde el servidor"
            />

            <Button
                size="small"
                shape="circle"
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={onOpenShortcuts}
                aria-label="Atajos y recomendaciones"
                title="Atajos y recomendaciones"
            />
        </Space>
    );
}
