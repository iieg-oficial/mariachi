import { useRef, useState } from 'react';
import { Button, Dropdown, Input, Popconfirm, Space } from 'antd';
import {
    DeleteOutlined,
    DragOutlined,
    FolderAddOutlined,
    PlusOutlined,
    SearchOutlined,
    UploadOutlined,
} from '@ant-design/icons';

export default function GeoserverFilesToolbar({
    isMobile,
    search,
    onSearchChange,
    disabled,
    onNewFolder,
    onUpload,
    extraActions,
    selectedCount = 0,
    onBulkMove,
    onBulkDelete,
}) {
    const [searchOpen, setSearchOpen] = useState(false);
    const inputRef = useRef(null);

    const abrirBusqueda = () => {
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const cerrarSiVacia = () => {
        if (!search.trim()) setSearchOpen(false);
    };

    const expandida = searchOpen || Boolean(search.trim());

    const menuItems = [
        { key: 'folder', icon: <FolderAddOutlined />, label: 'Nueva carpeta', onClick: onNewFolder },
        { key: 'upload', icon: <UploadOutlined />, label: 'Subir archivos', onClick: onUpload },
    ];

    return (
        <Space wrap size={8} style={{ justifyContent: 'flex-end' }}>
            {extraActions}
            {selectedCount > 0 && (
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
            <div onMouseEnter={() => setSearchOpen(true)} onMouseLeave={cerrarSiVacia}>
                {expandida ? (
                    <Input
                        ref={inputRef}
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Buscar en todos los recursos"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onBlur={cerrarSiVacia}
                        style={{ width: isMobile ? 200 : 280 }}
                    />
                ) : (
                    <Button
                        icon={<SearchOutlined />}
                        aria-label="Buscar recursos"
                        onClick={abrirBusqueda}
                        onFocus={abrirBusqueda}
                    />
                )}
            </div>
            <Dropdown menu={{ items: menuItems }} disabled={disabled} trigger={['click']}>
                <Button type="primary" icon={<PlusOutlined />} aria-label="Agregar" />
            </Dropdown>
        </Space>
    );
}
