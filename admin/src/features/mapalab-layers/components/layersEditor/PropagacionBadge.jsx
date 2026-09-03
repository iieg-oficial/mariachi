import { useState } from 'react';
import { Button, Dropdown, Modal, Tag, Tooltip, Typography } from 'antd';
import { message } from '@shared/services/message';
import { propagacionDelGrupo } from '@features/mapalab-layers/utils/propagacionTarjetita';

const { Text } = Typography;

const VERDE = '#389E0D';

// mariachi avisa a mapalab con `notify_tree_changed`, que agrupa los avisos en una ventana de
// 5 s antes de invalidar el cache del arbol. Recargar de inmediato trae el arbol viejo y parece
// que no paso nada: se recarga una vez ya, por si el cache estaba fresco, y otra pasada la ventana.
const VENTANA_DEBOUNCE_MS = 5500;

const esperar = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const fila = (extra) => ({ display: 'flex', alignItems: 'center', gap: 8, ...extra });

export default function PropagacionBadge({
    rawTree,
    groupId,
    onIrACapa = null,
    updateLayer = null,
    reload = null,
    configDelGrupo = null,
    puedePublicar = false,
}) {
    const [aplicando, setAplicando] = useState(false);
    const datos = propagacionDelGrupo(rawTree, groupId);
    if (!datos || datos.total === 0) return null;

    const usan = datos.heredan.length;
    const propias = datos.propias;
    const propagan = usan > 0;

    const motivoBloqueo = (() => {
        if (!puedePublicar) return 'Solo quien publica cambios puede propagar la tarjetita a otras capas.';
        if (!configDelGrupo) return 'El grupo todavía no tiene tarjetita que propagar.';
        if (propias.length === 0) return 'Todas las propiedades ya usan la del grupo.';
        return null;
    })();

    const devolverAlGrupo = async (ids) => {
        if (!updateLayer) return;
        setAplicando(true);
        const cerrar = message.loading('Aplicando… el árbol tarda unos segundos en refrescarse', 0);
        try {
            // Lo que se propaga tiene que ser lo que estas viendo: la tarjetita del grupo puede
            // tener cambios sin guardar y las propiedades leen la guardada, no la de la pantalla.
            await updateLayer(groupId, { infoboxConfig: configDelGrupo });
            for (const id of ids) {
                await updateLayer(id, { infoboxConfig: null });
            }
            await reload?.();
            await esperar(VENTANA_DEBOUNCE_MS);
            await reload?.();
            message.success(ids.length === 1
                ? 'Esa propiedad vuelve a usar la tarjetita del grupo'
                : `${ids.length} propiedades vuelven a usar la tarjetita del grupo`);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo aplicar la tarjetita del grupo');
        } finally {
            cerrar?.();
            setAplicando(false);
        }
    };

    const confirmar = (ids, titulo) => Modal.confirm({
        title: titulo,
        content: (
            <span>
                Primero se guarda la tarjetita del grupo tal como la tienes en pantalla, y luego se borra la
                propia de {ids.length === 1 ? 'esa capa' : `esas ${ids.length} capas`} para que muestren la del
                grupo. <b>Se guarda de inmediato</b> y no se puede deshacer desde aquí.
            </span>
        ),
        okText: 'Sí, aplicar',
        cancelText: 'Cancelar',
        onOk: () => devolverAlGrupo(ids),
    });

    const items = [
        {
            key: 'titulo',
            disabled: true,
            label: (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {usan} de {datos.total} propiedades usan esta tarjetita
                </Text>
            ),
        },
        { type: 'divider' },
        ...datos.heredan.map((p) => ({
            key: `h-${p.id}`,
            onClick: () => onIrACapa?.(p.id),
            label: (
                <div style={fila()}>
                    <Tag color="green" style={{ marginInlineEnd: 0, fontSize: 10 }}>usa la del grupo</Tag>
                    <span style={{ fontSize: 12 }}>{p.label}</span>
                </div>
            ),
        })),
        ...propias.map((p) => ({
            key: `p-${p.id}`,
            label: (
                <div style={fila({ justifyContent: 'space-between' })}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <Tag color="orange" style={{ marginInlineEnd: 0, fontSize: 10 }}>tiene la suya</Tag>
                        <span style={{ fontSize: 12 }}>{p.label}</span>
                    </span>
                    <Button
                        size="small"
                        type="link"
                        disabled={!puedePublicar || !configDelGrupo}
                        style={{ fontSize: 12, padding: 0, height: 18 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            confirmar([p.id], `¿${p.label} usa la tarjetita del grupo?`);
                        }}
                    >
                        usar esta
                    </Button>
                </div>
            ),
        })),
        ...datos.sinNada.map((p) => ({
            key: `s-${p.id}`,
            disabled: true,
            label: (
                <div style={fila()}>
                    <Tag style={{ marginInlineEnd: 0, fontSize: 10 }}>sin tarjetita</Tag>
                    <span style={{ fontSize: 12 }}>{p.label}</span>
                </div>
            ),
        })),
        { type: 'divider' },
        {
            key: 'todas',
            disabled: !puedePublicar || !configDelGrupo || propias.length === 0,
            label: (
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                    Que todas usen la del grupo
                    {propias.length > 0 && ` (${propias.length})`}
                </span>
            ),
            onClick: () => confirmar(
                propias.map((p) => p.id),
                `¿${propias.length} propiedades usan la tarjetita del grupo?`,
            ),
        },
        ...(motivoBloqueo ? [{
            key: 'motivo',
            disabled: true,
            label: (
                <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'normal', display: 'block', maxWidth: 260 }}>
                    {motivoBloqueo}
                </Text>
            ),
        }] : []),
        ...(datos.sinNada.length > 0 ? [
            { type: 'divider' },
            {
                key: 'refrescar',
                disabled: true,
                label: (
                    <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'normal', display: 'block', maxWidth: 260 }}>
                        Las que dicen «sin tarjetita» no la heredaron porque el grupo no tenía una cuando se
                        construyó el árbol. Guarda y refresca el árbol de capas.
                    </Text>
                ),
            },
        ] : []),
    ];

    return (
        <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight" disabled={aplicando}>
            <Tooltip
                title={`Esta tarjetita la usan ${usan} de ${datos.total} propiedades del grupo. Ábrelo para ver cuáles y aplicarla a las que no.`}
                color={propagan ? VERDE : undefined}
            >
                <Button
                    size="small"
                    loading={aplicando}
                    aria-label={`Propagación: ${usan} de ${datos.total} propiedades`}
                    style={propagan ? { color: VERDE, borderColor: '#B7EB8F' } : undefined}
                >
                    {usan}/{datos.total}
                </Button>
            </Tooltip>
        </Dropdown>
    );
}
