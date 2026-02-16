import { useState } from 'react';
import { Card, Alert, Button, Modal, Typography } from 'antd';
import { useAuth } from '@contexts/AuthContext';
import { useMenuDraft } from '@hooks/useMenuDraft';
import { useMenuIcons } from '@hooks/useMenuIcons';
import { useMenuItemModal } from '@hooks/useMenuItemModal';
import { findAllChildren } from '@utils/menuUtils';
import { MAX_LEVEL } from '@constants/menuConstants';
import MenuHeader from '@components/menuManager/MenuHeader';
import MenuItemModal from '@components/menuManager/MenuItemModal';
import PublishChangesModal from '@components/menuManager/PublishChangesModal';
import SortableTree from '@components/menuManager/SortableTree';

const { Text } = Typography;

export default function MenuManager() {
    const { user } = useAuth();

    const {
        menuItems, originalMenuItems, loading, publishing, hasChanges, isAdmin, createItem, updateItem,
        deleteItems, updateItemsOrder, discardChanges, getChangesSummary, publishChanges
    } = useMenuDraft(user);

    const { customIcons } = useMenuIcons();

    const [publishModalVisible, setPublishModalVisible] = useState(false);

    const {
        modalVisible,
        editingItem,
        selectedParent,
        urlPreview,
        iconType,
        form,
        handleCreate,
        handleAddChild,
        handleEdit,
        handleLabelChange,
        handleIconTypeChange,
        handleSubmit,
        handleCancel
    } = useMenuItemModal(menuItems, createItem, updateItem);

    const handleDelete = (item) => {
        const { idsToDelete, itemsToDelete } = findAllChildren(item.id, menuItems);
        const hasChildren = itemsToDelete.length > 1;

        Modal.confirm({
            title: '¿Está seguro de eliminar este item del menú?',
            content: (
                <div>
                    {hasChildren ? (
                        <>
                            <Text>Se eliminarán los siguientes items:</Text>
                            <ul style={{ marginTop: 12, marginBottom: 0 }}>
                                <li>
                                    <Text strong style={{ color: '#ff4d4f' }}>{item.label}</Text>
                                    <Text type="secondary"> (principal)</Text>
                                </li>
                                {itemsToDelete.slice(1).map(child => (
                                    <li key={child.id}>
                                        <Text strong style={{ color: '#ff7875' }}>{child.label}</Text>
                                        <Text type="secondary"> - {child.url}</Text>
                                    </li>
                                ))}
                            </ul>
                            <Alert
                                message={`Total: ${itemsToDelete.length} item(s) serán eliminados`}
                                type="error"
                                showIcon
                                style={{ marginTop: 16 }}
                            />
                        </>
                    ) : (
                        <Text>Se eliminará: <Text strong>{item.label}</Text></Text>
                    )}
                </div>
            ),
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            width: 500,
            onOk: () => deleteItems(idsToDelete, itemsToDelete.length)
        });
    };

    const handleReorder = (newItems) => {
        updateItemsOrder(newItems);
    };

    const handleDiscard = () => {
        Modal.confirm({
            title: '¿Está seguro de descartar todos los cambios?',
            content: 'Se perderán todas las modificaciones no publicadas.',
            okText: 'Descartar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: discardChanges
        });
    };

    const handlePublish = () => {
        setPublishModalVisible(true);
    };

    const confirmPublish = async () => {
        const result = await publishChanges();
        if (result?.published || result?.pending) {
            setPublishModalVisible(false);
        }
    };

    const { newItems, deletedItems, modifiedItems } = hasChanges ? getChangesSummary() : { newItems: [], deletedItems: [], modifiedItems: [] };
    const changesCount = newItems.length + deletedItems.length + modifiedItems.length;

    return (
        <div>
            <MenuHeader
                hasChanges={hasChanges}
                changesCount={changesCount}
                publishing={publishing}
                onDiscard={handleDiscard}
                onPublish={handlePublish}
            />

            {hasChanges && (
                <Alert
                    message="Modo borrador"
                    description={`Tienes ${changesCount} cambio(s) pendiente(s). ${isAdmin ? 'Los cambios se publicarán directamente.' : 'Un administrador debe aprobar los cambios.'}`}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    action={
                        <Button size="small" type="text" onClick={handlePublish}>
                            Ver cambios
                        </Button>
                    }
                />
            )}

            <Alert
                message="Menú jerárquico con arrastrar y soltar"
                description={`Arrastra los items para reordenarlos. Puedes crear menús con hasta ${MAX_LEVEL} niveles de profundidad. Usa los botones "Agregar hijo" para crear submenús.`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Card loading={loading}>
                {menuItems.length > 0 ? (
                    <SortableTree
                        items={menuItems}
                        originalItems={originalMenuItems}
                        customIcons={customIcons}
                        onReorder={handleReorder}
                        onEdit={handleEdit}
                        onAddChild={handleAddChild}
                        onDelete={handleDelete}
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 15 }}>
                        No hay items en el menú. Haz clic en "Nuevo Item de Nivel Superior" para comenzar.
                    </div>
                )}
            </Card>

            <MenuItemModal
                visible={modalVisible}
                editingItem={editingItem}
                selectedParent={selectedParent}
                form={form}
                urlPreview={urlPreview}
                iconType={iconType}
                customIcons={customIcons}
                onCancel={handleCancel}
                onSubmit={handleSubmit}
                onLabelChange={handleLabelChange}
                onIconTypeChange={handleIconTypeChange}
            />

            <PublishChangesModal
                visible={publishModalVisible}
                loading={publishing}
                newItems={newItems}
                modifiedItems={modifiedItems}
                deletedItems={deletedItems}
                onCancel={() => setPublishModalVisible(false)}
                onConfirm={confirmPublish}
                isAdmin={isAdmin}
            />
        </div>
    );
}
