import { useState } from 'react';
import { Modal } from 'antd';
import { message } from '@shared/services/message';
import { refrescarArbol } from '@features/mapalab-layers/utils/refrescoArbol';

export function useTarjetitaAlGrupo({ updateLayer, reload, onAplicado = null }) {
    const [aplicando, setAplicando] = useState(false);

    const aplicar = async ({ groupId, config, ids }) => {
        if (!updateLayer) return;
        setAplicando(true);
        const cerrar = message.loading('Aplicando… el árbol tarda unos segundos en refrescarse', 0);
        try {
            await updateLayer(groupId, { infoboxConfig: config });
            for (const id of ids) {
                await updateLayer(id, { infoboxConfig: null });
            }
            await refrescarArbol(reload, { alVuelo: false });
            onAplicado?.();
            message.success(ids.length === 1
                ? 'Esa propiedad vuelve a usar la tarjetita del grupo'
                : `${ids.length} propiedades usan la tarjetita del grupo`);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo aplicar la tarjetita del grupo');
        } finally {
            cerrar?.();
            setAplicando(false);
        }
    };

    const confirmar = ({ groupId, config, ids, titulo }) => Modal.confirm({
        title: titulo,
        content: 'Se guarda de inmediato y no se puede deshacer desde aquí.',
        okText: 'Sí, aplicar',
        cancelText: 'Cancelar',
        onOk: () => aplicar({ groupId, config, ids }),
    });

    return { aplicando, confirmar };
}
