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
import { GridSearchDropdown } from '@shared/components/dataGrid';

export const ALL_WORKSPACES = '__todos__';

const EXPORT_ITEMS = [
    { key: 'xlsx', icon: <FileExcelOutlined />, label: 'Excel (datos + historial)' },
    { key: 'csv-metadatos', icon: <FileTextOutlined />, label: 'CSV de metadatos' },
    { key: 'csv-historial', icon: <HistoryOutlined />, label: 'CSV de historial' },
];

export default function MetadataGridToolbar({
    isDesktop,
    dirtyCount,
    saving,
    onSave,
    onUndo,
    canUndo,
    search,
    onSearchChange,
    workspace,
    onWorkspaceChange,
    workspaceItems,
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
                placeholder="Buscar capa, nombre o descripción"
            />

            <Dropdown
                placement="bottomRight"
                trigger={['click']}
                menu={{
                    items: workspaceItems,
                    selectable: true,
                    selectedKeys: [workspace || ALL_WORKSPACES],
                    onClick: ({ key }) => onWorkspaceChange(key === ALL_WORKSPACES ? null : key),
                    style: { maxHeight: 320, overflowY: 'auto' },
                }}
            >
                <Button
                    size="small"
                    type={workspace ? 'default' : 'text'}
                    icon={<FilterOutlined />}
                    title="Filtrar por workspace"
                >
                    {workspace || 'Workspace'}
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
                    title="Descargar metadatos e historial de cambios"
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
