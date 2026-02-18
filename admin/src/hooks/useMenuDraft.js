import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { message } from 'antd';
import api from '@services/api';

const RESOURCE_TYPE = 'elementos-menu';
const RESOURCE_ID = 'global';

export const useMenuDraft = (user, { reviewMode = false, borradorId = null } = {}) => {
    const navigate = useNavigate();
    const [originalMenuItems, setOriginalMenuItems] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [nextTempId, setNextTempId] = useState(1);
    const [hasDraft, setHasDraft] = useState(false);
    const [draftId, setDraftId] = useState(null);
    const [borradorEstado, setBorradorEstado] = useState('en_progreso');
    const [comentarioRechazo, setComentarioRechazo] = useState(null);
    const [reviewAuthor, setReviewAuthor] = useState(null);

    const isAdmin = user?.role === 'tetlamamakani';

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const hasChanges = JSON.stringify(originalMenuItems) !== JSON.stringify(menuItems);

    const fetchMenuItems = async () => {
        setLoading(true);
        try {
            const itemsResponse = await api.get('/elementos-menu');
            setOriginalMenuItems(itemsResponse.data);

            if (reviewMode && borradorId) {
                const reviewResponse = await api.get(`/borradores/por-id/${borradorId}`);
                const reviewData = reviewResponse.data;
                setMenuItems(reviewData.data?.menuItems || itemsResponse.data);
                setNextTempId(reviewData.data?.nextTempId || 1);
                setHasDraft(true);
                setDraftId(reviewData.id);
                setReviewAuthor(reviewData.usuario);
            } else {
                const draftResponse = await api.get(`/borradores/${RESOURCE_TYPE}/${RESOURCE_ID}`).catch(() => ({ data: null }));
                if (draftResponse.data?.data) {
                    const draftData = draftResponse.data.data;
                    setMenuItems(draftData.menuItems || itemsResponse.data);
                    setNextTempId(draftData.nextTempId || 1);
                    setHasDraft(true);
                    setDraftId(draftResponse.data.id);
                    setBorradorEstado(draftResponse.data.estado || 'en_progreso');
                    setComentarioRechazo(draftResponse.data.comentario_rechazo || null);
                } else {
                    setMenuItems(itemsResponse.data);
                    setHasDraft(false);
                    setDraftId(null);
                }
            }
        } catch {
            message.error('Error al cargar items del menú');
        } finally {
            setLoading(false);
        }
    };

    const saveDraft = useCallback(async (items, tempId) => {
        if (reviewMode) return;
        try {
            const response = await api.put(`/borradores/${RESOURCE_TYPE}/${RESOURCE_ID}`, {
                data: { menuItems: items, nextTempId: tempId }
            });
            setHasDraft(true);
            setDraftId(response.data.id);
            setBorradorEstado(response.data.estado || 'en_progreso');
            setComentarioRechazo(null);
        } catch {}
    }, [reviewMode]);

    const deleteDraft = async () => {
        try {
            if (reviewMode && borradorId) {
                await api.delete(`/borradores/por-id/${borradorId}`);
            } else {
                await api.delete(`/borradores/${RESOURCE_TYPE}/${RESOURCE_ID}`);
            }
            setHasDraft(false);
            setDraftId(null);
        } catch {}
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
            await api.delete(`/elementos-menu/${item.id}`);
        }

        const tempIdMap = {};
        for (const item of newItems) {
            const { id, ...itemData } = item;
            if (itemData.parentId?.toString().startsWith('temp-')) {
                itemData.parentId = tempIdMap[itemData.parentId] || null;
            }
            const response = await api.post('/elementos-menu', itemData);
            tempIdMap[id] = response.data.id;
        }

        for (const item of modifiedItems) {
            await api.put(`/elementos-menu/${item.id}`, item);
        }
    };

    const solicitarRevision = async () => {
        if (!hasDraft) {
            message.error('No hay cambios guardados para enviar a revisión');
            return false;
        }
        try {
            await api.post(`/borradores/${RESOURCE_TYPE}/${RESOURCE_ID}/solicitar-revision`);
            setBorradorEstado('pendiente_revision');
            message.success('Cambios de menú enviados a revisión');
            return true;
        } catch {
            message.error('Error al enviar a revisión');
            return false;
        }
    };

    const rechazarRevision = async (comentario) => {
        try {
            await api.post(`/borradores/por-id/${borradorId}/rechazar`, { comentario });
            message.success('Borrador rechazado');
            navigate('/revision');
        } catch {
            message.error('Error al rechazar el borrador');
        }
    };

    const openPreview = async () => {
        const WEB_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:3010';
        try {
            const { data } = await api.post('/preview/menu', { items: menuItems });
            window.open(`${WEB_URL}/?menu-preview=${data.token}`, '_blank');
        } catch {
            message.error('Error al generar vista previa del menú');
        }
    };

    const publishChanges = async () => {
        if (!hasDraft && !reviewMode) {
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
                if (reviewMode) navigate('/revision');
                return { published: true };
            } else {
                return await solicitarRevision()
                    ? { published: false, pending: true }
                    : { published: false, error: true };
            }
        } catch {
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
        borradorEstado,
        comentarioRechazo,
        reviewAuthor,
        createItem,
        updateItem,
        deleteItems,
        updateItemsOrder,
        discardChanges,
        getChangesSummary,
        publishChanges,
        solicitarRevision,
        rechazarRevision,
        openPreview
    };
};
