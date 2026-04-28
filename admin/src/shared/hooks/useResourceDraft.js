import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import api from '@shared/services/api';

const AUTOSAVE_DELAY_MS = 1500;

export default function useResourceDraft({
    resourceType,
    resourceId,
    enabled = true,
    reviewMode = false,
    borradorId = null,
    onApplyDraft,
}) {
    const [hasDraft, setHasDraft] = useState(false);
    const [borradorEstado, setBorradorEstado] = useState('en_progreso');
    const [comentarioRechazo, setComentarioRechazo] = useState(null);
    const [reviewAuthor, setReviewAuthor] = useState(null);
    const [saving, setSaving] = useState(false);

    const saveTimerRef = useRef(null);
    const onApplyRef = useRef(onApplyDraft);
    useEffect(() => { onApplyRef.current = onApplyDraft; }, [onApplyDraft]);

    useEffect(() => {
        if (!enabled || !resourceType || !resourceId) return;
        let cancelled = false;

        const loadReview = async () => {
            try {
                const res = await api.get(`/borradores/por-id/${borradorId}`);
                if (cancelled) return;
                setReviewAuthor(res.data?.usuario || null);
                setHasDraft(true);
                setBorradorEstado(res.data?.estado || 'pendiente_revision');
                if (onApplyRef.current && res.data?.data) onApplyRef.current(res.data.data);
            } catch {
                if (!cancelled) message.error('No se pudo cargar el borrador en revisión');
            }
        };

        const loadOwn = async () => {
            try {
                const res = await api.get(`/borradores/${resourceType}/${resourceId}`);
                if (cancelled) return;
                if (!res.data) return;
                setHasDraft(true);
                setBorradorEstado(res.data?.estado || 'en_progreso');
                setComentarioRechazo(res.data?.comentario_rechazo || null);
                if (onApplyRef.current && res.data?.data) onApplyRef.current(res.data.data);
                if (res.data?.estado === 'rechazado') message.warning('Tu borrador fue rechazado.');
                else if (res.data?.estado === 'pendiente_revision') message.info('Tu borrador está pendiente de revisión.');
                else message.info('Se restauró un borrador guardado previamente.');
            } catch {
                /* sin borrador previo */
            }
        };

        if (reviewMode && borradorId) loadReview();
        else loadOwn();

        return () => { cancelled = true; };
    }, [enabled, resourceType, resourceId, reviewMode, borradorId]);

    const saveDraft = useCallback(async (data) => {
        if (reviewMode || !resourceType || !resourceId) return;
        setSaving(true);
        try {
            const res = await api.put(`/borradores/${resourceType}/${resourceId}`, { data });
            setHasDraft(true);
            setBorradorEstado(res.data?.estado || 'en_progreso');
            setComentarioRechazo(null);
        } catch { /* silencioso */ } finally {
            setSaving(false);
        }
    }, [resourceType, resourceId, reviewMode]);

    const scheduleAutosave = useCallback((data) => {
        if (reviewMode) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveDraft(data), AUTOSAVE_DELAY_MS);
    }, [reviewMode, saveDraft]);

    const cancelAutosave = useCallback(() => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
    }, []);

    useEffect(() => () => cancelAutosave(), [cancelAutosave]);

    const deleteDraft = useCallback(async () => {
        cancelAutosave();
        try {
            if (reviewMode && borradorId) {
                await api.delete(`/borradores/por-id/${borradorId}`);
            } else if (resourceType && resourceId) {
                await api.delete(`/borradores/${resourceType}/${resourceId}`);
            }
            setHasDraft(false);
            setBorradorEstado('en_progreso');
            setComentarioRechazo(null);
        } catch { /* silencioso si no existe */ }
    }, [resourceType, resourceId, reviewMode, borradorId, cancelAutosave]);

    const solicitarRevision = useCallback(async (data) => {
        if (reviewMode || !resourceType || !resourceId) return false;
        cancelAutosave();
        try {
            await saveDraft(data);
            await api.post(`/borradores/${resourceType}/${resourceId}/solicitar-revision`);
            setBorradorEstado('pendiente_revision');
            message.success('Borrador enviado a revisión');
            return true;
        } catch {
            message.error('Error al enviar a revisión');
            return false;
        }
    }, [resourceType, resourceId, reviewMode, cancelAutosave, saveDraft]);

    const aprobar = useCallback(async () => {
        if (!reviewMode || !borradorId) return false;
        try {
            await api.post(`/borradores/por-id/${borradorId}/aprobar`);
            message.success('Borrador aprobado');
            return true;
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al aprobar');
            return false;
        }
    }, [reviewMode, borradorId]);

    const rechazar = useCallback(async (comentario) => {
        if (!reviewMode || !borradorId) return false;
        try {
            await api.post(`/borradores/por-id/${borradorId}/rechazar`, { comentario });
            message.success('Borrador rechazado');
            return true;
        } catch {
            message.error('Error al rechazar');
            return false;
        }
    }, [reviewMode, borradorId]);

    return {
        hasDraft,
        borradorEstado,
        comentarioRechazo,
        reviewAuthor,
        saving,
        scheduleAutosave,
        cancelAutosave,
        saveDraft,
        deleteDraft,
        solicitarRevision,
        aprobar,
        rechazar,
    };
}
