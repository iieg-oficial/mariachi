import { useCallback } from 'react';
import { Button } from 'antd';
import useCambios from '@shared/hooks/useCambios';
import { rutaMenciona } from '@shared/services/cambios';
import { message } from '@shared/services/message';
import { refrescarArbol } from '@features/mapalab-layers/utils/refrescoArbol';

const RECURSOS = ['layers', 'layer-metadata', 'borradores', 'publicaciones-capas'];
const AVISO = 'cambios-capa-remota';

export default function useCambiosDeCapa({ layerId, recargarArbol, recargarCapa, recargarBorradores, hayCambiosPropios }) {
    const alCambiar = useCallback((lote) => {
        const reconexion = lote.some((evento) => evento.tipo === 'reconectado');
        const publicados = lote.filter((evento) => evento.recurso !== 'borradores');
        if (reconexion || lote.length > publicados.length) recargarBorradores?.();
        if (reconexion || publicados.length) refrescarArbol(recargarArbol);
        if (!layerId) return;
        const deEstaCapa = publicados.find((evento) => rutaMenciona(evento.ruta, layerId));
        if (!deEstaCapa && !reconexion) return;
        const autor = deEstaCapa?.autor || 'Alguien';
        if (!hayCambiosPropios()) {
            recargarCapa();
            if (deEstaCapa) message.info(`${autor} guardó cambios en esta capa`);
            return;
        }
        if (!deEstaCapa) return;
        message.open({
            key: AVISO,
            type: 'warning',
            duration: 0,
            content: (
                <span>
                    {autor} guardó cambios en esta capa
                    <Button
                        type="link"
                        size="small"
                        onClick={() => {
                            message.destroy(AVISO);
                            recargarCapa();
                        }}
                    >
                        Recargar
                    </Button>
                </span>
            ),
        });
    }, [layerId, recargarArbol, recargarCapa, recargarBorradores, hayCambiosPropios]);

    useCambios(RECURSOS, alCambiar);
}
