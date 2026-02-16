import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '@services/api';

const RESOURCE_TYPE = 'menu_items';

export const useMenuDraft = (user) => {
    const [originalMenuItems, setOriginalMenuItems] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [nextTempId, setNextTempId] = useState(1);
    const [hasDraft, setHasDraft] = useState(false);
    const [draftId, setDraftId] = useState(null);
    const [pendingRequest, setPendingRequest] = useState(null);

    const isAdmin = user?.role === 'tetlamamakani';

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const hasChanges = JSON.stringify(originalMenuItems) !== JSON.stringify(menuItems);

    const fetchMenuItems = async () => {
        setLoading(true);
        try {
            const [itemsResponse, draftResponse] = await Promise.all([
                api.get('/menu-items'),
                api.get(`/borradores/${RESOURCE_TYPE}`).catch(() => ({ data: null }))
            ]);

            setOriginalMenuItems(itemsResponse.data);

            if (draftResponse.data?.data) {
                const draftData = JSON.parse(draftResponse.data.data);
                setMenuItems(draftData.menuItems || itemsResponse.data);
                setNextTempId(draftData.nextTempId || 1);
                setHasDraft(true);
                setDraftId(draftResponse.data.id);
            } else {
                setMenuItems(itemsResponse.data);
                setHasDraft(false);
                setDraftId(null);
            }
        } catch {
            message.error('Error al cargar items del menú');
        } finally {
            setLoading(false);
        }
    };

    const saveDraft = useCallback(async (items, tempId) => {
        try {
            const response = await api.put(`/borradores/${RESOURCE_TYPE}`, {
                resource_type: RESOURCE_TYPE,
                data: JSON.stringify({ menuItems: items, nextTempId: tempId })
            });
            setHasDraft(true);
            setDraftId(response.data.id);
        } catch {
        }
    }, []);

    const deleteDraft = async () => {
        try {
            await api.delete(`/borradores/${RESOURCE_TYPE}`);
            setHasDraft(false);
            setDraftId(null);
        } catch {
        }
    };

    const createItem = (itemData) => {
        const newItem = {
            ...itemData,
            id: `temp-${nextTempId}`,
            order: itemData.order || 0,
            visible: itemData.visible !== undefined ? itemData.visible : true,
            external: itemData.external || false,
            parentId: itemData.parentId || null
        };
        const newTempId = nextTempId + 1;
        setNextTempId(newTempId);
        const newItems = [...menuItems, newItem];
        setMenuItems(newItems);
        saveDraft(newItems, newTempId);
        message.success('Item creado en el borrador.');
    };

    const updateItem = (itemId, itemData) => {
        const newItems = menuItems.map(item =>
            item.id === itemId ? { ...item, ...itemData } : item
        );
        setMenuItems(newItems);
        saveDraft(newItems, nextTempId);
        message.success('Item actualizado en el borrador.');
    };

    const deleteItems = (idsToDelete, count) => {
        const newItems = menuItems.filter(i => !idsToDelete.includes(i.id));
        setMenuItems(newItems);
        saveDraft(newItems, nextTempId);
        message.success(`${count} item(s) eliminado(s) del borrador.`);
    };

    const updateItemsOrder = (updatedItems) => {
        setMenuItems(updatedItems);
        saveDraft(updatedItems, nextTempId);
        message.success('Orden actualizado en el borrador.');
    };

    const discardChanges = async () => {
        setMenuItems([...originalMenuItems]);
        setNextTempId(1);
        await deleteDraft();
        message.success('Cambios descartados');
    };

    const getChangesSummary = () => {
        const newItems = menuItems.filter(item => item.id?.toString().startsWith('temp-'));
        const deletedItems = originalMenuItems.filter(orig => !menuItems.find(item => item.id === orig.id));
        const modifiedItems = menuItems.filter(item => {
            if (item.id?.toString().startsWith('temp-')) return false;
            const original = originalMenuItems.find(orig => orig.id === item.id);
            return original && JSON.stringify(original) !== JSON.stringify(item);
        });

        return { newItems, deletedItems, modifiedItems };
    };

    const applyChangesToDatabase = async () => {
        const { newItems, deletedItems, modifiedItems } = getChangesSummary();

        for (const item of deletedItems) {
            await api.delete(`/menu-items/${item.id}`);
        }

        const tempIdMap = {};
        for (const item of newItems) {
            const { id, ...itemData } = item;
            if (itemData.parentId?.toString().startsWith('temp-')) {
                itemData.parentId = tempIdMap[itemData.parentId] || null;
            }
            const response = await api.post('/menu-items', itemData);
            tempIdMap[id] = response.data.id;
        }

        for (const item of modifiedItems) {
            await api.put(`/menu-items/${item.id}`, item);
        }
    };

    const publishChanges = async () => {
        if (!hasDraft || !draftId) {
            message.error('No hay borrador para publicar');
            return false;
        }

        setPublishing(true);

        try {
            if (isAdmin) {
                await applyChangesToDatabase();
                await deleteDraft();
                message.success('Cambios publicados exitosamente');
                await fetchMenuItems();
                return { published: true };
            } else {
                await api.post('/solicitudes-publicacion', {
                    resource_type: RESOURCE_TYPE,
                    draft_id: draftId
                });
                setPendingRequest(true);
                message.success('Solicitud de publicación enviada. Un administrador debe aprobarla.');
                return { published: false, pending: true };
            }
        } catch (error) {
            if (error.response?.status === 400) {
                message.warning('Ya existe una solicitud pendiente para este borrador');
                return { published: false, pending: true };
            }
            message.error('Error al procesar la publicación');
            return { published: false, error: true };
        } finally {
            setPublishing(false);
        }
    };

    return {
        menuItems,
        originalMenuItems,
        loading,
        publishing,
        hasChanges,
        hasDraft,
        isAdmin,
        pendingRequest,
        createItem,
        updateItem,
        deleteItems,
        updateItemsOrder,
        discardChanges,
        getChangesSummary,
        publishChanges
    };
};

