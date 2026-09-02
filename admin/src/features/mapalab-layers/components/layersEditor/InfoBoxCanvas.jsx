import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Tooltip, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, HolderOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { buildCardPlan, referencedFields } from '@shared/infoboxPlan';
import { pintarBloque } from './infoBoxPainters.jsx';
import { useSampleFeatures } from './sampleFeaturesContext';
import {
    BLOCK_DEFS,
    blockDef,
    naturalOrder,
    resolveBodyOrder,
    typeOfKey,
} from '@features/mapalab-layers/constants/infoboxBlocks';

const { Text } = Typography;

const ANCHO_TARJETA = 239;
// Las asas y los botones de la seccion viven a los lados de la tarjeta. El panel blanco
// abarca tambien esa canaleta para que no parezcan sueltos afuera; el contenido se queda
// en 239 px, que es lo que mide de verdad en el visor.
const CANALETA = 28;
const ANCHO_PANEL = ANCHO_TARJETA + CANALETA * 2;

const EJEMPLOS = {
    nombre: 'Parque Metropolitano', municipio: 'Guadalajara', tipo: 'Parque urbano',
    calle: 'Av. Beethoven', numero_ext: '5800', colonia: 'La Estancia', cp: '45030',
    direccion: 'Av. Beethoven 5800', telefono: '33 1234 5678', horario: '6:00 - 21:00',
    fecha: '2026-01-15', superficie: '186', visitantes: '1200000',
};

const ejemploPara = (campo) => {
    if (EJEMPLOS[campo] !== undefined) return EJEMPLOS[campo];
    const bajo = campo.toLowerCase();
    for (const k of Object.keys(EJEMPLOS)) if (bajo.includes(k)) return EJEMPLOS[k];
    return `<${campo}>`;
};

const featureDeEjemplo = (cfg) => {
    const props = {};
    referencedFields(cfg).forEach((c) => { props[c] = ejemploPara(c); });
    return props;
};

const Insertador = ({ onAdd, permanente, duplicable, conPlantillas }) => {
    const [visible, setVisible] = useState(false);
    const items = [
        ...BLOCK_DEFS.filter((b) => b.key !== 'headerField').map((b) => ({ key: b.key, label: b.label })),
        ...(duplicable ? [{ type: 'divider' }, { key: '__dup', label: 'Duplicar la de arriba' }] : []),
        ...(conPlantillas ? [{ type: 'divider' }, { key: '__plantillas', label: 'Reemplazar con una plantilla…' }] : []),
    ];
    const mostrar = permanente || visible;
    return (
        <div
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
            style={{ height: 18, display: 'flex', alignItems: 'center', gap: 6, opacity: mostrar ? 1 : 0, transition: 'opacity .12s' }}
        >
            <span style={{ flex: 1, height: 1, background: '#e8e2ee' }} />
            <Dropdown menu={{ items, onClick: ({ key }) => onAdd(key) }} trigger={['click']}>
                <Button size="small" type="text" icon={<PlusOutlined />} aria-label="Agregar sección" style={{ height: 18, fontSize: 10 }} />
            </Dropdown>
            <span style={{ flex: 1, height: 1, background: '#e8e2ee' }} />
        </div>
    );
};

const Seccion = ({ id, seleccionada, onSelect, onDuplicate, onRemove, etiqueta, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            data-block-key={id}
            style={{
                transform: CSS.Transform.toString(transform), transition,
                opacity: isDragging ? .5 : 1, position: 'relative',
                border: `1px solid ${seleccionada ? '#5C2472' : 'transparent'}`,
                background: seleccionada ? 'rgba(92,36,114,.05)' : 'transparent',
                borderRadius: 5, padding: '2px 4px', cursor: 'pointer',
                minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word',
            }}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSelect(); } }}
            aria-label={`Sección ${etiqueta}`}
        >
            <div style={{ position: 'absolute', left: -22, top: 2, display: 'flex', flexDirection: 'column' }}>
                <Button
                    type="text" size="small" icon={<HolderOutlined />} aria-label={`Mover ${etiqueta}`}
                    {...attributes} {...listeners}
                    style={{ cursor: 'grab', touchAction: 'none', height: 18, width: 18, minWidth: 18 }}
                />
            </div>
            {seleccionada && (
                <div style={{ position: 'absolute', right: -22, top: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Tooltip title="Duplicar" placement="right">
                        <Button type="text" size="small" icon={<CopyOutlined />} onClick={(e) => { e.stopPropagation(); onDuplicate(); }} aria-label={`Duplicar ${etiqueta}`} style={{ height: 18, width: 18, minWidth: 18 }} />
                    </Tooltip>
                    <Tooltip title="Quitar" placement="right">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={`Quitar ${etiqueta}`} style={{ height: 18, width: 18, minWidth: 18 }} />
                    </Tooltip>
                </div>
            )}
            {children}
        </div>
    );
};

export default function InfoBoxCanvas({
    config,
    onChange,
    seleccion,
    onSeleccion,
    onAddBlock,
    onDuplicateBlock,
    onRemoveBlock,
    onAbrirPlantillas = null,
    atenuado = false,
    soloVista = false,
}) {
    const { features } = useSampleFeatures();
    const rootRef = useRef(null);
    const [idxFeature, setIdxFeature] = useState(0);
    useEffect(() => { setIdxFeature(0); }, [features]);

    const propiedades = features[idxFeature]?.properties || featureDeEjemplo(config);
    const plan = useMemo(
        () => buildCardPlan(propiedades, config, { variant: 'desktop' }),
        [propiedades, config],
    );

    const orden = resolveBodyOrder(config);
    const porLlave = new Map((plan?.blocks || []).map((b) => [b.key, b]));
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    const alSoltar = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const desde = orden.indexOf(active.id);
        const hasta = orden.indexOf(over.id);
        if (desde === -1 || hasta === -1) return;
        const nuevo = arrayMove(orden, desde, hasta);
        const natural = naturalOrder(config);
        const iguales = nuevo.length === natural.length && nuevo.every((k, i) => k === natural[i]);
        onChange({ ...config, blockOrder: iguales ? undefined : nuevo });
    };

    const insertar = (llaveDespues) => (que) => {
        if (que === '__plantillas') onAbrirPlantillas?.();
        else if (que === '__dup' && llaveDespues) onDuplicateBlock(llaveDespues);
        else onAddBlock(que);
    };

    const tieneCabecera = config.headerField !== undefined;

    return (
        <div ref={rootRef} style={{ opacity: atenuado ? .55 : 1, pointerEvents: atenuado ? 'none' : undefined }}>
            <div style={{
                width: soloVista ? ANCHO_TARJETA : ANCHO_PANEL,
                padding: soloVista ? 0 : `0 ${CANALETA}px`,
                background: '#fff', borderRadius: 8,
                boxShadow: '0 2px 10px rgba(0,0,0,.1)', overflow: 'visible',
            }}>
                <div style={{ width: ANCHO_TARJETA, minWidth: 0 }}>
                    {tieneCabecera ? (
                        <div
                            data-block-key="headerField"
                            onClick={() => !soloVista && onSeleccion('headerField')}
                            role={soloVista ? undefined : 'button'}
                            tabIndex={soloVista ? undefined : 0}
                            onKeyDown={(e) => { if (!soloVista && e.key === 'Enter') { e.preventDefault(); onSeleccion('headerField'); } }}
                            style={{
                                background: '#EFF3FC', padding: '9px 11px', borderRadius: 6, marginTop: soloVista ? 0 : 10,
                                position: 'relative', cursor: 'pointer',
                                outline: !soloVista && seleccion === 'headerField' ? '1px solid #5C2472' : 'none',
                            }}
                        >
                            {!soloVista && (
                                <Tooltip title="El título siempre va arriba y no se mueve ni se duplica" placement="left">
                                    <LockOutlined style={{ position: 'absolute', left: -22, top: 12, fontSize: 10, color: '#bfbfbf' }} />
                                </Tooltip>
                            )}
                            <Text strong style={{ fontSize: 13, color: '#2E4372', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                {plan?.title || <Text type="secondary" style={{ fontSize: 12 }}>Sin título</Text>}
                            </Text>
                        </div>
                    ) : (!soloVista && (
                        <div style={{ padding: '4px 0', marginTop: 8 }}>
                            <Button
                                type="text"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => onAddBlock('headerField')}
                                style={{ fontSize: 11, height: 20, color: '#8c8c8c' }}
                            >
                            Agregar título
                            </Button>
                        </div>
                    ))}

                    <div style={{ padding: '8px 0 12px', display: 'flex', flexDirection: 'column' }}>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={alSoltar}>
                            <SortableContext items={orden} strategy={verticalListSortingStrategy}>
                                {orden.map((llave, i) => {
                                    const bloque = porLlave.get(llave);
                                    const def = blockDef(typeOfKey(llave));
                                    return (
                                        <div key={llave}>
                                            {i > 0 && !soloVista && <Insertador onAdd={insertar(orden[i - 1])} duplicable />}
                                            {soloVista ? (
                                                <div>{bloque ? pintarBloque(bloque) : null}</div>
                                            ) : (
                                                <Seccion
                                                    id={llave}
                                                    etiqueta={def?.label || llave}
                                                    seleccionada={seleccion === llave}
                                                    onSelect={() => onSeleccion(llave)}
                                                    onDuplicate={() => onDuplicateBlock(llave)}
                                                    onRemove={() => onRemoveBlock(llave)}
                                                >
                                                    {bloque ? pintarBloque(bloque) : (
                                                        <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                                                            {def?.label}: sin datos todavía
                                                        </Text>
                                                    )}
                                                </Seccion>
                                            )}
                                        </div>
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                        {!soloVista && (
                            <Insertador
                                onAdd={insertar(orden[orden.length - 1])}
                                duplicable={orden.length > 0}
                                conPlantillas={!!onAbrirPlantillas}
                                permanente
                            />
                        )}
                        {!tieneCabecera && orden.length === 0 && !soloVista && (
                            <Text type="secondary" style={{ fontSize: 11, textAlign: 'center', padding: '6px 0' }}>
                            Agrega una sección para empezar
                            </Text>
                        )}
                    </div>
                </div>
            </div>

            {features.length > 1 && !soloVista && (
                <div style={{ width: ANCHO_PANEL, marginTop: 8, paddingLeft: CANALETA, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Button size="small" type="text" disabled={idxFeature === 0} onClick={() => setIdxFeature((i) => i - 1)} aria-label="Registro anterior">◀</Button>
                    <Text type="secondary" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                        {idxFeature + 1} / {features.length}
                    </Text>
                    <Button size="small" type="text" disabled={idxFeature >= features.length - 1} onClick={() => setIdxFeature((i) => i + 1)} aria-label="Registro siguiente">▶</Button>
                    <Text type="secondary" style={{ fontSize: 10 }}>registros reales</Text>
                </div>
            )}
        </div>
    );
}
