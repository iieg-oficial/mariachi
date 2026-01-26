import { useState, useEffect } from 'react';
import { message } from 'antd';
import api from '@services/api';

export const useMenuDraft = () => {
    const [originalMenuItems, setOriginalMenuItems] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [nextTempId, setNextTempId] = useState(1);

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const hasChanges = JSON.stringify(originalMenuItems) !== JSON.stringify(menuItems);

    const fetchMenuItems = async () => {
        setLoading(true);
        try {
            const response = await api.get('/menu-items');
            setOriginalMenuItems(response.data);
            setMenuItems(response.data);
        } catch {
            message.error('Error al cargar items del menú');
        } finally {
            setLoading(false);
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
        setNextTempId(prev => prev + 1);
        setMenuItems(prev => [...prev, newItem]);
        message.success('Item creado en el borrador. Recuerda publicar los cambios.');
    };

    const updateItem = (itemId, itemData) => {
        setMenuItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, ...itemData } : item
        ));
        message.success('Item actualizado en el borrador. Recuerda publicar los cambios.');
    };

    const deleteItems = (idsToDelete, count) => {
        setMenuItems(prev => prev.filter(i => !idsToDelete.includes(i.id)));
        message.success(`${count} item(s) eliminado(s) del borrador. Recuerda publicar los cambios.`);
    };

    const updateItemsOrder = (updatedItems) => {
        setMenuItems(updatedItems);
        message.success('Orden actualizado en el borrador. Recuerda publicar los cambios.');
    };

    const discardChanges = () => {
        setMenuItems([...originalMenuItems]);
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

    const publishChanges = async () => {
        setPublishing(true);
        const { newItems, deletedItems, modifiedItems } = getChangesSummary();

        try {
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

            message.success('Cambios publicados exitosamente');
            await fetchMenuItems();
            return true;
        } catch {
            message.error('Error al publicar cambios');
            return false;
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
        createItem,
        updateItem,
        deleteItems,
        updateItemsOrder,
        discardChanges,
        getChangesSummary,
        publishChanges
    };
};
