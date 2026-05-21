import { useMemo } from 'react';
import { flattenLeaves } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';

const EVENTOS_ROOT_KEY = '__eventos_root__';

const buildLayerLookup = (rawTree) => {
    const map = new Map();
    for (const l of flattenLeaves(rawTree)) {
        map.set(`${l.workspace}/${l.layer}`, l);
    }
    return map;
};

const capaNodes = (capas, parentKey, layerLookup) => (capas || []).map((c, i) => {
    if (c.tipo === 'etiqueta') {
        return {
            key: `${parentKey}-eti-${i}`,
            title: c.alias || '(sin nombre)',
            nodeType: 'evento-etiqueta',
            raw: { kind: 'evento-etiqueta' },
        };
    }
    if (c.tipo === 'categoria') {
        const catKey = `${parentKey}-cat-${i}`;
        return {
            key: catKey,
            title: c.alias || '(sin nombre)',
            nodeType: 'evento-categoria',
            raw: { kind: 'evento-categoria' },
            children: capaNodes(c.capas, catKey, layerLookup),
        };
    }
    const layerKey = `${c.workspace}/${c.layer}`;
    const layer = layerLookup.get(layerKey);
    return {
        key: `${parentKey}-cap-${i}-${layerKey}`,
        title: c.alias || layer?.label || layerKey,
        nodeType: 'evento-capa',
        workspaceAlias: c.workspace,
        geoserverLayer: c.layer,
        raw: { kind: 'evento-capa', layerId: layer?.id || null, workspace: c.workspace, layer: c.layer },
    };
});

export function buildEventosTreeNode(eventos, rawTree) {
    if (!eventos?.length) return null;
    const layerLookup = buildLayerLookup(rawTree);
    return {
        key: EVENTOS_ROOT_KEY,
        title: `Eventos (${eventos.length})`,
        nodeType: 'evento-root',
        raw: { kind: 'evento-root' },
        children: eventos.map((e) => {
            const eKey = `evento-${e.id}`;
            return {
                key: eKey,
                title: e.titulo || `Evento ${e.id}`,
                nodeType: 'evento',
                iconUrl: e.iconoUrl,
                raw: { kind: 'evento', id: e.id, estado: e.estado, activo: e.activo },
                children: capaNodes(e.capas, eKey, layerLookup),
            };
        }),
    };
}

export function useEventosTreeNode(eventos, rawTree) {
    return useMemo(() => buildEventosTreeNode(eventos, rawTree), [eventos, rawTree]);
}

export { EVENTOS_ROOT_KEY };
