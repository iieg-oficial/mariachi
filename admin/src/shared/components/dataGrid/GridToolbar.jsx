import { Button, Dropdown, Space } from 'antd';
import {
    DownloadOutlined,
    FileExcelOutlined,
    FileTextOutlined,
    FilterOutlined,
    HistoryOutlined,
    QuestionCircleOutlined,
    ReloadOutlined,
    SaveOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import GridSearchDropdown from '@shared/components/dataGrid/GridSearchDropdown';

export const ALL_FILTER_VALUES = '__todos__';

const EXPORT_ITEMS = [
    { key: 'xlsx', icon: <FileExcelOutlined />, label: 'Excel (datos + historial)' },
    { key: 'csv-metadatos', icon: <FileTextOutlined />, label: 'CSV de datos' },
    { key: 'csv-historial', icon: <HistoryOutlined />, label: 'CSV de historial' },
];

export default function GridToolbar({
    isDesktop,
    dirtyCount,
    saving,
    onSave,
    onUndo,
    canUndo,
    search,
    onSearchChange,
    searchPlaceholder,
    searchOpen,
    onSearchOpenChange,
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
            <Button
                size="small"
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!dirtyCount}
                onClick={onSave}
                title={dirtyCount ? 'Guardar los cambios pendientes' : 'No hay cambios por guardar'}
            >
                {dirtyCount ? `Guardar ${dirtyCount}` : 'Sin cambios'}
            </Button>

            <Button
                size="small"
                type="text"
                icon={<UndoOutlined />}
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Deshacer"
                title="Deshacer el último cambio (Ctrl+Z)"
            />

            <GridSearchDropdown
                value={search}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                open={searchOpen}
                onOpenChange={onSearchOpenChange}
            />

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
                type="text"
                icon={<HistoryOutlined />}
                onClick={onOpenHistory}
                aria-label="Historial de cambios"
                title="Ver historial de cambios"
            />

            <Button
                size="small"
                type="text"
                icon={<ReloadOutlined />}
                onClick={onReload}
                disabled={saving}
                aria-label="Recargar"
                title="Recargar desde el servidor"
            />

            <Button
                size="small"
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={onOpenShortcuts}
                aria-label="Atajos y recomendaciones"
                title="Atajos y recomendaciones"
            />
        </Space>
    );
}
