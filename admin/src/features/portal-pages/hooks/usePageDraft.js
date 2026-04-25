import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { message } from 'antd';
import api from '@shared/services/api';
import { BLOCK_CONFIG } from '@features/portal-pages/constants/pageConstants';

const DRAFT_RESOURCE = 'pagina';

export const usePageDraft = (pageId, { reviewMode = false, borradorId = null } = {}) => {
    const navigate = useNavigate();
    const [originalPage, setOriginalPage] = useState(null);
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nextTempId, setNextTempId] = useState(1);
    const [hasDraft, setHasDraft] = useState(false);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [editores, setEditores] = useState([]);
    const [borradorEstado, setBorradorEstado] = useState('en_progreso');
    const [comentarioRechazo, setComentarioRechazo] = useState(null);
    const [reviewAuthor, setReviewAuthor] = useState(null);

    const hasChanges = JSON.stringify(originalPage) !== JSON.stringify(page);
    const saveTimerRef = useRef(null);
    const draftSaveEnabled = useRef(false);
    const presenceIntervalRef = useRef(null);

    useEffect(() => {
        if (pageId) loadPage();
    }, [pageId, loadPage]);

    useEffect(() => {
        if (!pageId) return;

        const registrar = async () => {
            try { await api.put(`/paginas/${pageId}/presencia`); } catch { /* silencioso */ }
        };
        const obtener = async () => {
            try {
                const { data } = await api.get(`/paginas/${pageId}/presencia`);
                setEditores(data);
            } catch { /* silencioso */ }
        };

        registrar();
        obtener();
        presenceIntervalRef.current = setInterval(() => { registrar(); obtener(); }, 20000);
        return () => clearInterval(presenceIntervalRef.current);
    }, [pageId]);

    const loadPage = useCallback(async () => {
        setLoading(true);
        draftSaveEnabled.current = false;
        try {
            const response = await api.get(`/paginas/${pageId}`);
            const pageData = response.data || { id: pageId, menuItemId: pageId, title: '', sections: [], seo: { metaTitle: '', metaDescription: '' } };

            if (pageData.sections?.length > 0 && pageData.sections[0].columns) {
                pageData.sections = [];
            }

            setOriginalPage(JSON.parse(JSON.stringify(pageData)));
            setUpdatedAt(pageData.updatedAt || null);

            if (reviewMode && borradorId) {
                const reviewResponse = await api.get(`/borradores/por-id/${borradorId}`);
                const reviewData = reviewResponse.data;
                setPage({ ...JSON.parse(JSON.stringify(pageData)), ...reviewData.data });
                setReviewAuthor(reviewData.usuario);
                setHasDraft(true);
            } else {
                try {
                    const draftResponse = await api.get(`/borradores/${DRAFT_RESOURCE}/${pageId}`);
                    const draftData = draftResponse.data;
                    if (draftData) {
                        setPage({ ...JSON.parse(JSON.stringify(pageData)), ...draftData.data });
                        setHasDraft(true);
                        setBorradorEstado(draftData.estado);
                        setComentarioRechazo(draftData.comentario_rechazo || null);
                        if (draftData.estado === 'rechazado') {
                            message.warning('Tu borrador fue rechazado.');
                        } else if (draftData.estado === 'pendiente_revision') {
                            message.info('Tu borrador está pendiente de revisión.');
                        } else {
                            message.info('Se restauró un borrador guardado previamente.');
                        }
                    } else {
                        setPage(JSON.parse(JSON.stringify(pageData)));
                    }
                } catch {
                    setPage(JSON.parse(JSON.stringify(pageData)));
                }
            }
        } catch (error) {
            console.error('Error loading page:', error);
            const emptyPage = { id: pageId, menuItemId: pageId, title: '', sections: [], seo: { metaTitle: '', metaDescription: '' } };
            setOriginalPage(emptyPage);
            setPage(emptyPage);
        } finally {
            setLoading(false);
        }
    }, [pageId, reviewMode, borradorId]);

    const pageRef = useRef(page);
    useEffect(() => { pageRef.current = page; });

    const saveDraft = useCallback(async (pageData) => {
        if (reviewMode) return;
        const data = pageData || pageRef.current;
        if (!data || !pageId) return;
        setSaving(true);
        try {
            const response = await api.put(`/borradores/${DRAFT_RESOURCE}/${pageId}`, {
                data: { sections: data.sections, seo: data.seo, title: data.title, slug: data.slug }
            });
            setHasDraft(true);
            setBorradorEstado(response.data?.estado || 'en_progreso');
            setComentarioRechazo(null);
        } catch { /* fallo silencioso */ } finally {
            setSaving(false);
        }
    }, [pageId, reviewMode]);

    useEffect(() => {
        if (!draftSaveEnabled.current || !pageId || reviewMode) return;

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveDraft(), 1500);

        return () => clearTimeout(saveTimerRef.current);
    }, [page, pageId, reviewMode, saveDraft]);

    const deleteDraft = async () => {
        try {
            if (reviewMode && borradorId) {
                await api.delete(`/borradores/por-id/${borradorId}`);
            } else {
                await api.delete(`/borradores/${DRAFT_RESOURCE}/${pageId}`);
            }
            setHasDraft(false);
        } catch { /* silencioso si no existe */ }
    };

    const addBlock = (blockType) => {
        const config = BLOCK_CONFIG[blockType];
        if (!config) return;
        const newBlock = {
            id: `temp-block-${nextTempId}`,
            type: blockType,
            props: JSON.parse(JSON.stringify(config.defaultProps))
        };
        setNextTempId(prev => prev + 1);
        const updated = { ...page, sections: [...page.sections, newBlock] };
        setPage(updated);
        if (!reviewMode) saveDraft(updated);
    };

    const removeBlock = (blockId) => {
        const updated = { ...page, sections: page.sections.filter(b => b.id !== blockId) };
        setPage(updated);
        if (!reviewMode) saveDraft(updated);
    };

    const moveBlock = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === page.sections.length - 1) return;
        const newSections = [...page.sections];
        const target = direction === 'up' ? index - 1 : index + 1;
        [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
        const updated = { ...page, sections: newSections };
        setPage(updated);
        if (!reviewMode) saveDraft(updated);
    };

    const duplicateBlock = (index) => {
        const newBlock = { ...JSON.parse(JSON.stringify(page.sections[index])), id: `temp-block-${nextTempId}` };
        const newSections = [...page.sections];
        newSections.splice(index + 1, 0, newBlock);
        setNextTempId(prev => prev + 1);
        const updated = { ...page, sections: newSections };
        setPage(updated);
        if (!reviewMode) saveDraft(updated);
        message.success('Bloque duplicado');
    };

    const updatePageStructure = (newSections) => {
        const updated = { ...page, sections: newSections };
        setPage(updated);
        if (!reviewMode) saveDraft(updated);
    };

    const updateBlock = (blockId, newProps) => {
        if (!reviewMode) draftSaveEnabled.current = true;
        setPage(prev => ({
            ...prev,
            sections: prev.sections.map(b =>
                b.id === blockId ? { ...b, props: { ...b.props, ...newProps } } : b
            )
        }));
    };

    const updateSEO = (seoData) => {
        if (!reviewMode) draftSaveEnabled.current = true;
        setPage(prev => ({ ...prev, seo: { ...prev.seo, ...seoData } }));
    };

    const discardChanges = () => {
        draftSaveEnabled.current = false;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setPage(JSON.parse(JSON.stringify(originalPage)));
        deleteDraft();
        message.success('Cambios descartados');
    };

    const solicitarRevision = async () => {
        await saveDraft();
        try {
            await api.post(`/borradores/${DRAFT_RESOURCE}/${pageId}/solicitar-revision`);
            setBorradorEstado('pendiente_revision');
            message.success('Borrador enviado a revisión');
        } catch {
            message.error('Error al enviar a revisión. Asegúrate de tener cambios guardados.');
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
        const WEB_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:3010'
        const { data } = await api.post(`/preview/paginas/${pageId}`, {
            sections: page.sections,
            title: page.title,
            slug: page.slug
        })
        const previewPath = page.slug === 'home' ? '/' : `/${page.slug}`
        window.open(`${WEB_URL}${previewPath}?preview=${data.token}`, '_blank')
    }

    const publishChanges = async () => {
        setPublishing(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        try {
            const pageToPublish = {
                ...page,
                sections: page.sections.map(block => ({
                    ...block,
                    id: block.id?.startsWith('temp-') ? undefined : block.id
                })),
                expectedUpdatedAt: updatedAt
            };

            const response = await api.put(`/paginas/${pageId}`, pageToPublish);
            await deleteDraft();

            setOriginalPage(JSON.parse(JSON.stringify(page)));
            setUpdatedAt(response.data?.updatedAt || null);
            message.success('Página publicada exitosamente');
            return true;
        } catch (error) {
            console.error('Error publishing page:', error);
            if (error.response?.status === 409) {
                message.error('La página fue modificada por otro usuario. Recarga para ver los cambios.');
            } else {
                message.error('Error al publicar la página');
            }
            return false;
        } finally {
            setPublishing(false);
        }
    };

    return {
        page,
        loading,
        publishing,
        saving,
        hasChanges,
        hasDraft,
        editores,
        borradorEstado,
        comentarioRechazo,
        reviewAuthor,
        addBlock,
        removeBlock,
        updateBlock,
        moveBlock,
        duplicateBlock,
        updateSEO,
        updatePageStructure,
        discardChanges,
        publishChanges,
        saveDraft,
        solicitarRevision,
        rechazarRevision,
        openPreview
    };
};
