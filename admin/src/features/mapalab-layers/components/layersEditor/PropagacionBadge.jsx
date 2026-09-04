import { useState } from 'react';
import { Button, Dropdown, Modal, Popover, Space, Tag, Tooltip, Typography } from 'antd';
import { CheckCircleFilled, InfoCircleOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { propagacionDelGrupo } from '@features/mapalab-layers/utils/propagacionTarjetita';
import { refrescarArbol } from '@features/mapalab-layers/utils/refrescoArbol';

const { Text } = Typography;

const VERDE = '#389E0D';

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
            await refrescarArbol(reload, { alVuelo: false });
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
        propias.length === 0
            ? {
                key: 'listo',
                disabled: true,
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: VERDE }}>
                        <CheckCircleFilled />
                        Ya todas usan la del grupo
                    </span>
                ),
            }
            : {
                key: 'todas',
                disabled: !puedePublicar || !configDelGrupo,
                label: (
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                        Que todas usen la del grupo ({propias.length})
                    </span>
                ),
                onClick: () => confirmar(
                    propias.map((p) => p.id),
                    `¿${propias.length} propiedades usan la tarjetita del grupo?`,
                ),
            },
    ];

    const ayuda = (
        <div style={{ maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Text style={{ fontSize: 12 }}>
                Las propiedades de un grupo muestran <b>la tarjetita del grupo</b> mientras no tengan una
                propia. Editas la del grupo y cambian todas.
            </Text>
            <Text style={{ fontSize: 12 }}>
                El contador dice cuántas la están usando. Ábrelo para ver cuáles y, si alguna tiene la suya,
                hacer que use la del grupo.
            </Text>
            {propias.length === 0 && (
                <Text style={{ fontSize: 12, color: VERDE }}>
                    Ahora mismo las {datos.total} la usan: no hay nada que propagar.
                </Text>
            )}
            {datos.sinNada.length > 0 && (
                <Text type="warning" style={{ fontSize: 12 }}>
                    Las que dicen «sin tarjetita» no la heredaron porque el grupo no tenía una cuando se
                    construyó el árbol. Guarda y refresca el árbol de capas.
                </Text>
            )}
            {!puedePublicar && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Solo quien publica cambios puede aplicarla a otras capas.
                </Text>
            )}
        </div>
    );

    return (
        <Space size={4}>
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight" disabled={aplicando}>
                <Button
                    size="small"
                    loading={aplicando}
                    aria-label={`Propagación: ${usan} de ${datos.total} propiedades`}
                    style={propagan ? { color: VERDE, borderColor: '#B7EB8F' } : undefined}
                >
                    {usan}/{datos.total}
                </Button>
            </Dropdown>
            <Popover content={ayuda} title="Tarjetita del grupo" trigger="click" placement="bottomRight">
                <Button
                    size="small"
                    type="text"
                    icon={<InfoCircleOutlined />}
                    aria-label="Cómo funciona la tarjetita del grupo"
                />
            </Popover>
        </Space>
    );
}
