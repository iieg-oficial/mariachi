import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import {
    actualizarCapa,
    bulkDelete,
    bulkUpdate,
    eliminarCapa,
    listCapas,
    listInstituciones,
    listTags,
    listWorkspaces,
} from '../api/catalogoService';

export const useCatalogoData = () => {
    const [capas, setCapas] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [tagOptions, setTagOptions] = useState([]);
    const [instituciones, setInstituciones] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadCapas = useCallback(async () => {
        setLoading(true);
        try {
            setCapas(await listCapas());
        } catch {
            message.error('No se pudieron cargar las capas del catálogo');
        } finally {
            setLoading(false);
        }
    }, []);

    const reloadTags = useCallback(() => listTags().then(setTagOptions).catch(() => {}), []);

    const reloadInstituciones = useCallback(
        () => listInstituciones().then(setInstituciones).catch(() => {}),
        [],
    );

    useEffect(() => {
        loadCapas();
        listWorkspaces().then(setWorkspaces).catch(() => {});
        reloadTags();
        reloadInstituciones();
    }, [loadCapas, reloadTags, reloadInstituciones]);

    const patchCapa = (id, patch) =>
        setCapas((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

    const guardarCampo = async (id, patch, errorMsg) => {
        try {
            await actualizarCapa(id, patch);
            patchCapa(id, patch);
        } catch (err) {
            message.error(err?.response?.data?.detail || errorMsg);
            throw err;
        }
    };

    const handleTagsSave = async (id, searchTags) => {
        await guardarCampo(id, { searchTags }, 'No se pudieron guardar las etiquetas');
        reloadTags();
    };

    const handleEnabledSave = (id, enabled) =>
        guardarCampo(id, { enabled }, 'No se pudo cambiar el estado de la capa');

    const handleInstitucionSave = (id, institucionId) =>
        guardarCampo(id, { institucionId }, 'No se pudo cambiar la institución');

    const handleDelete = async (capa) => {
        try {
            await eliminarCapa(capa.id);
            message.success('Capa eliminada');
            loadCapas();
        } catch {
            message.error('No se pudo eliminar la capa');
        }
    };

    const handleBulkDelete = async (ids) => {
        try {
            await bulkDelete(ids);
            message.success(`${ids.length} capa(s) eliminada(s)`);
            loadCapas();
        } catch {
            message.error('No se pudieron eliminar las capas');
        }
    };

    const handleBulkUpdate = async (ids, cambios) => {
        try {
            await bulkUpdate(ids, cambios);
            message.success(`${ids.length} capa(s) actualizada(s)`);
            loadCapas();
            if (cambios.searchTags) reloadTags();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron actualizar las capas');
        }
    };

    return {
        capas,
        workspaces,
        tagOptions,
        instituciones,
        loading,
        setCapas,
        loadCapas,
        reloadTags,
        reloadInstituciones,
        handleTagsSave,
        handleEnabledSave,
        handleInstitucionSave,
        handleDelete,
        handleBulkDelete,
        handleBulkUpdate,
    };
};
