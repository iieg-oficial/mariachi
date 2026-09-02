import { useState } from 'react';
import { Button, Modal, Space, Tooltip, Typography } from 'antd';
import { RedoOutlined, UndoOutlined } from '@ant-design/icons';

import InfoBoxCanvas from './InfoBoxCanvas.jsx';
import {
    CardsBlock,
    HeaderFieldBlock,
    IconTextBlock,
    LabelGroupsBlock,
    ListBlock,
    TextBlock,
} from './InfoBoxBlocksEditor.jsx';
import { normalizeInfoboxConfig } from './infoBoxTextBlocks';
import { useInfoboxUndo } from '@features/mapalab-layers/hooks/useInfoboxUndo';
import {
    blockDef,
    blockInstances,
    planAddBlock,
    planDuplicateBlock,
    planRemoveBlock,
    planSetBlockItems,
    resolveBodyOrder,
    typeOfKey,
} from '@features/mapalab-layers/constants/infoboxBlocks';

const { Text } = Typography;

const EDITORES = {
    labelGroups: LabelGroupsBlock,
    list: ListBlock,
    iconText: IconTextBlock,
    text: TextBlock,
    cards: CardsBlock,
};

export default function InfoBoxLienzo({ value, onChange, availableFields = [], inherited = null, soloVista = false, onAbrirPlantillas = null }) {
    const config = normalizeInfoboxConfig(value || {});
    const [seleccion, setSeleccion] = useState(null);
    const { undo, redo, canUndo, canRedo } = useInfoboxUndo(value, onChange);

    const propio = !!value && Object.keys(value).length > 0;
    const heredando = !propio && !!inherited;
    const configVista = heredando ? normalizeInfoboxConfig(inherited.config) : config;

    const actualizar = (patch) => {
        const siguiente = { ...config, ...patch };
        Object.keys(siguiente).forEach((k) => siguiente[k] === undefined && delete siguiente[k]);
        onChange?.(Object.keys(siguiente).length ? siguiente : null);
    };

    const aplicar = (plan) => {
        if (!plan) return;
        actualizar(plan.patch);
        if (plan.focusKey) setSeleccion(plan.focusKey);
    };

    const orden = resolveBodyOrder(config);

    const personalizar = () => Modal.confirm({
        title: '¿Crear tarjetita propia para esta capa?',
        content: (
            <span>
                Vas a copiar la del grupo <code>{inherited.label}</code> para editarla solo aquí.
                Los cambios del grupo <b>ya no se propagarán</b> a esta capa.
            </span>
        ),
        okText: 'Sí, personalizar',
        cancelText: 'Cancelar',
        onOk: () => onChange(JSON.parse(JSON.stringify(inherited.config))),
    });

    const editorDeSeleccion = () => {
        if (!seleccion) return null;
        if (seleccion === 'headerField') {
            return (
                <HeaderFieldBlock
                    bare
                    value={config.headerField ?? ''}
                    onChange={(v) => actualizar({ headerField: v ?? '' })}
                    onRemove={() => { actualizar({ headerField: undefined }); setSeleccion(null); }}
                    availableFields={availableFields}
                />
            );
        }
        const tipo = typeOfKey(seleccion);
        const instancia = blockInstances(config, tipo).find((i) => i.key === seleccion);
        const Editor = EDITORES[tipo];
        if (!instancia || !Editor) return null;
        const comunes = {
            bare: true,
            value: instancia.items,
            onChange: (items) => aplicar(planSetBlockItems(config, orden, seleccion, items)),
            onRemove: () => { aplicar(planRemoveBlock(config, orden, seleccion)); setSeleccion(null); },
            availableFields,
        };
        if (tipo === 'cards') {
            return (
                <CardsBlock
                    {...comunes}
                    columns={config.cardsColumns ?? 1}
                    onColumnsChange={(v) => actualizar({ cardsColumns: v })}
                />
            );
        }
        return <Editor {...comunes} />;
    };

    const etiquetaSeleccion = seleccion
        ? (blockDef(typeOfKey(seleccion))?.label || seleccion)
        : null;

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, minWidth: 0, alignItems: 'flex-start', justifyContent: soloVista ? 'center' : undefined }}>
            <div style={{ flex: '0 0 auto', minWidth: 0 }}>
                {heredando && (
                    <div style={{ marginBottom: 10, maxWidth: 260 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                            Heredada del grupo <code>{inherited.label}</code>. Se ve así en el visor.
                        </Text>
                        <Button size="small" type="primary" onClick={personalizar}>
                            Personalizar para esta capa
                        </Button>
                    </div>
                )}
                {(canUndo || canRedo) && !soloVista && (
                    <Space size={6} style={{ marginBottom: 8 }}>
                        <Tooltip title="Deshacer (Ctrl+Z)">
                            <Button size="small" icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} aria-label="Deshacer" />
                        </Tooltip>
                        <Tooltip title="Rehacer (Ctrl+Shift+Z)">
                            <Button size="small" icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} aria-label="Rehacer" />
                        </Tooltip>
                    </Space>
                )}
                <InfoBoxCanvas
                    config={configVista}
                    onChange={onChange}
                    seleccion={seleccion}
                    onSeleccion={setSeleccion}
                    onAddBlock={(tipo) => {
                        if (tipo === 'headerField') {
                            actualizar({ headerField: '' });
                            setSeleccion('headerField');
                            return;
                        }
                        aplicar(planAddBlock(config, orden, tipo));
                    }}
                    onDuplicateBlock={(llave) => aplicar(planDuplicateBlock(config, orden, llave))}
                    onRemoveBlock={(llave) => { aplicar(planRemoveBlock(config, orden, llave)); setSeleccion(null); }}
                    atenuado={heredando}
                    soloVista={soloVista}
                    onAbrirPlantillas={onAbrirPlantillas}
                />
            </div>

            {!soloVista && (
                <div style={{ flex: '1 1 300px', minWidth: 0, borderLeft: '1px dashed #e8e2ee', paddingLeft: 20 }}>
                    {soloVista ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                        Así se pinta en el visor. Vuelve a editar para tocar las secciones.
                        </Text>
                    ) : seleccion ? (
                        <>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>{etiquetaSeleccion}</Text>
                            {editorDeSeleccion()}
                        </>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                        Toca una sección de la tarjeta para editarla, o usa el <b>+</b> para agregar una.
                        </Text>
                    )}
                </div>
            )}
        </div>
    );
}
