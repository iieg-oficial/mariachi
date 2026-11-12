import { Dropdown, Space } from 'antd';
import {
    DownloadOutlined,
    FilterOutlined,
    HistoryOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';
import GridIconButton from '@shared/components/dataGrid/GridIconButton';
import { EXPORT_ITEMS } from '@shared/components/dataGrid/exportItems';

export const ALL_FILTER_VALUES = '__todos__';

export default function GridToolbar({
    isDesktop,
    filterValue,
    onFilterChange,
    filterItems,
    filterLabel,
    filterOpen,
    onFilterOpenChange,
    onOpenShortcuts,
    onOpenHistory,
    onExport,
    exporting,
    extra,
}) {
    return (
        <Space size={6} wrap={!isDesktop}>
            {extra}

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
                <GridIconButton
                    size="small"
                    type={filterValue ? 'default' : 'text'}
                    icon={<FilterOutlined />}
                    label={filterValue || `Filtrar por ${filterLabel.toLowerCase()}`}
                    expanded={Boolean(filterValue)}
                />
            </Dropdown>

            <Dropdown
                placement="bottomRight"
                trigger={['click']}
                menu={{ items: EXPORT_ITEMS, onClick: ({ key }) => onExport(key) }}
            >
                <GridIconButton
                    size="small"
                    type="text"
                    icon={<DownloadOutlined />}
                    label="Descargar"
                    loading={exporting}
                />
            </Dropdown>

            <GridIconButton
                size="small"
                type="text"
                icon={<HistoryOutlined />}
                label="Historial"
                onClick={onOpenHistory}
            />

            <GridIconButton
                size="small"
                type="text"
                icon={<QuestionCircleOutlined />}
                label="Atajos"
                onClick={onOpenShortcuts}
            />
        </Space>
    );
}
