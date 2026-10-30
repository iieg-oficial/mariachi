import { Button, Popconfirm, Space, Tooltip } from 'antd';
import { DeleteOutlined, DragOutlined, PlusOutlined } from '@ant-design/icons';

export default function GeoserverFilesToolbar({
    uploadDisabled,
    onUpload,
    extraActions,
    selectedCount = 0,
    onBulkMove,
    onBulkDelete,
}) {
    return (
        <Space wrap size={8} style={{ justifyContent: 'flex-end' }}>
            {extraActions}
            {selectedCount > 0 && (
                <>
                    <Button shape="round" icon={<DragOutlined />} onClick={onBulkMove}>
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
                        <Button shape="round" danger icon={<DeleteOutlined />}>
                            Eliminar ({selectedCount})
                        </Button>
                    </Popconfirm>
                </>
            )}
            <Tooltip title={uploadDisabled ? 'Entra a una carpeta para subir' : 'Subir archivos'}>
                <Button
                    type="primary"
                    shape="circle"
                    icon={<PlusOutlined />}
                    aria-label="Subir archivos"
                    disabled={uploadDisabled}
                    onClick={onUpload}
                />
            </Tooltip>
        </Space>
    );
}
