import { Button, Input, Popconfirm, Segmented, Space } from 'antd';
import {
    AppstoreOutlined,
    BarsOutlined,
    DeleteOutlined,
    DragOutlined,
    EditOutlined,
    FolderAddOutlined,
    PlusOutlined,
    SearchOutlined,
} from '@ant-design/icons';

export default function GeoserverFilesToolbar({
    isMobile,
    search,
    onSearchChange,
    viewMode,
    onViewModeChange,
    disabled,
    onNewFolder,
    onUpload,
    extraActions,
    editMode = false,
    onToggleEditMode,
    selectedCount = 0,
    onBulkMove,
    onBulkDelete,
}) {
    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
                flex: '1 1 auto',
                minWidth: 0,
            }}>
                <div style={{ flex: isMobile ? '1 1 100%' : '1 1 320px', minWidth: 0 }}>
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Buscar en todos los recursos (global + workspaces)"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <div style={{ flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
                    <Segmented
                        block={isMobile}
                        options={[
                            { label: 'Grid', value: 'grid', icon: <AppstoreOutlined /> },
                            { label: 'Lista', value: 'list', icon: <BarsOutlined /> },
                        ]}
                        value={viewMode}
                        onChange={onViewModeChange}
                    />
                </div>
            </div>
            <Space wrap style={{ flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
                {extraActions}
                {editMode && selectedCount > 0 && (
                    <>
                        <Button icon={<DragOutlined />} onClick={onBulkMove}>
                            Mover ({selectedCount})
                        </Button>
                        <Popconfirm
                            title={`¿Eliminar ${selectedCount} recurso(s)?`}
                            description="Las carpetas se borran con todo su contenido."
                            okText="Eliminar"
                            okButtonProps={{ danger: true }}
                            cancelText="Cancelar"
                            onConfirm={onBulkDelete}
                        >
                            <Button danger icon={<DeleteOutlined />}>
                                Eliminar ({selectedCount})
                            </Button>
                        </Popconfirm>
                    </>
                )}
                <Button
                    icon={<EditOutlined />}
                    type={editMode ? 'primary' : 'default'}
                    ghost={editMode}
                    onClick={onToggleEditMode}
                    disabled={disabled}
                >
                    {editMode ? 'Salir de edición' : 'Modo edición'}
                </Button>
                <Button icon={<FolderAddOutlined />} onClick={onNewFolder} disabled={disabled}>
                    Nueva carpeta
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={onUpload} disabled={disabled}>
                    Subir archivos
                </Button>
            </Space>
        </div>
    );
}
