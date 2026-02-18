import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, Alert, Button, Modal, Input } from 'antd';
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
    const [searchParams] = useSearchParams();

    const isAdmin = user?.role === 'tetlamamakani';
    const reviewMode = isAdmin && searchParams.get('review') === 'true';
    const borradorId = searchParams.get('borrador');

    const {
        menuItems, originalMenuItems, loading, publishing, hasChanges,
        hasDraft, borradorEstado, comentarioRechazo, reviewAuthor,
        updateItem, updateItemsOrder, discardChanges,
        getChangesSummary, publishChanges, openPreview, rechazarRevision
    } = useMenuDraft(user, { reviewMode, borradorId });

    const { customIcons } = useMenuIcons();

    const [publishModalVisible, setPublishModalVisible] = useState(false);
    const [rechazarModalVisible, setRechazarModalVisible] = useState(false);
    const [rechazarComentario, setRechazarComentario] = useState('');

    const {
        modalVisible, editingItem, selectedParent, urlPreview, iconType, form,
        handleEdit, handleLabelChange, handleIconTypeChange, handleSubmit, handleCancel
    } = useMenuItemModal(menuItems, null, updateItem);

    const handleReorder = (newItems) => updateItemsOrder(newItems);

    const handleEditPage = (itemId) => navigate(`/pages/edit/${itemId}`);

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
        if (reviewMode) {
            publishChanges();
        } else {
            setPublishModalVisible(true);
        }
    };

    const confirmPublish = async () => {
        const result = await publishChanges();
        if (result?.published || result?.pending) {
            setPublishModalVisible(false);
        }
    };

    const { newItems, deletedItems, modifiedItems } = hasChanges
        ? getChangesSummary()
        : { newItems: [], deletedItems: [], modifiedItems: [] };
    const changesCount = newItems.length + deletedItems.length + modifiedItems.length;

    return (
        <div>
            <MenuHeader
                hasChanges={hasChanges}
                changesCount={changesCount}
                publishing={publishing}
                isAdmin={isAdmin}
                reviewMode={reviewMode}
                reviewAuthor={reviewAuthor}
                borradorEstado={borradorEstado}
                onDiscard={handleDiscard}
                onPublish={handlePublish}
                onPreview={openPreview}
                onRechazar={() => setRechazarModalVisible(true)}
            />

            {!isAdmin && borradorEstado === 'rechazado' && (
                <Alert
                    type="error"
                    message="Borrador rechazado"
                    description={comentarioRechazo || 'El administrador rechazó el borrador sin especificar un motivo.'}
                    style={{ marginBottom: 16 }}
                    showIcon
                />
            )}

            {hasChanges && !reviewMode && (
                <Alert
                    message="Modo borrador"
                    description={`Tienes ${changesCount} cambio(s) pendiente(s). ${isAdmin ? 'Los cambios se publicarán directamente.' : 'Envíalos a revisión cuando estén listos.'}`}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    action={
                        isAdmin && (
                            <Button size="small" type="text" onClick={() => setPublishModalVisible(true)}>
                                Ver cambios
                            </Button>
                        )
                    }
                />
            )}

            {!reviewMode && (
                <Alert
                    message="Menú jerárquico con arrastrar y soltar"
                    description="Arrastra los items para reordenarlos. Usa el botón de editar para modificar cada item."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

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

            <Modal
                title="Rechazar borrador de menú"
                open={rechazarModalVisible}
                onOk={async () => {
                    await rechazarRevision(rechazarComentario);
                    setRechazarModalVisible(false);
                    setRechazarComentario('');
                }}
                onCancel={() => { setRechazarModalVisible(false); setRechazarComentario(''); }}
                okText="Rechazar"
                okType="danger"
                cancelText="Cancelar"
            >
                <Input.TextArea
                    placeholder="Motivo del rechazo (opcional)"
                    value={rechazarComentario}
                    onChange={e => setRechazarComentario(e.target.value)}
                    rows={3}
                />
            </Modal>
        </div>
    );
}
