import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, Alert, Button, Modal } from 'antd';
import { useAuth } from '@contexts/AuthContext';
import { useMenuDraft } from '@hooks/useMenuDraft';
import { useMenuIcons } from '@hooks/useMenuIcons';
import { useMenuItemModal } from '@hooks/useMenuItemModal';
import MenuHeader from '@components/menuManager/MenuHeader';
import MenuItemModal from '@components/menuManager/MenuItemModal';
import PublishChangesModal from '@components/menuManager/PublishChangesModal';
import SortableTree from '@components/menuManager/SortableTree';

export default function MenuManager() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const {
        menuItems, originalMenuItems, loading, publishing, hasChanges, isAdmin, updateItem,
        updateItemsOrder, discardChanges, getChangesSummary, publishChanges
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
        handleEdit,
        handleLabelChange,
        handleIconTypeChange,
        handleSubmit,
        handleCancel
    } = useMenuItemModal(menuItems, null, updateItem);

    const handleReorder = (newItems) => {
        updateItemsOrder(newItems);
    };

    const handleEditPage = (itemId) => {
        navigate(`/pages/edit/${itemId}`);
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
                description="Arrastra los items para reordenarlos. Usa el botón de editar para modificar cada item."
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
                        onEditPage={handleEditPage}
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 15 }}>
                        No hay items en el menú.
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
