import { useMemo, useState } from 'react';
import { Alert, Col, Empty, Input, Modal, Row, Tabs, Tag, Typography } from 'antd';
import InfoBoxPreview from './InfoBoxPreview';
import { INFOBOX_TEMPLATES } from '@features/mapalab-layers/constants/infoboxTemplates';

const { Text } = Typography;

const LISTA_STYLE = { maxHeight: 360, overflowY: 'auto', paddingRight: 4 };

const configDe = (nodo) => nodo?.infoboxConfig || nodo?.infobox_config || nodo?.littleCard || null;

const etiquetaDe = (nodo) => String(nodo?.label || nodo?.id || '').replace(/^\*/, '');

const recolectarCapas = (nodos, ruta = [], acc = []) => {
    for (const nodo of nodos || []) {
        const config = configDe(nodo);
        if (config) {
            acc.push({ id: nodo.id, label: etiquetaDe(nodo), ruta: ruta.join(' › '), config });
        }
        if (nodo.children?.length) recolectarCapas(nodo.children, [...ruta, etiquetaDe(nodo)], acc);
    }
    return acc;
};

const Opcion = ({ titulo, detalle, extra, seleccionada, deshabilitada, onClick }) => (
    <div
        role="button"
        tabIndex={deshabilitada ? -1 : 0}
        onClick={() => !deshabilitada && onClick()}
        onKeyDown={(e) => {
            if (deshabilitada) return;
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
        }}
        style={{
            border: `1px solid ${seleccionada ? '#5C2472' : '#f0f0f0'}`,
            background: seleccionada ? '#F7F3FA' : '#fff',
            borderRadius: 6,
            padding: '8px 10px',
            marginBottom: 6,
            cursor: deshabilitada ? 'not-allowed' : 'pointer',
            opacity: deshabilitada ? 0.5 : 1,
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Text strong style={{ fontSize: 13 }}>{titulo}</Text>
            {extra}
        </div>
        {detalle && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{detalle}</Text>
        )}
    </div>
);

export default function InfoBoxTemplatesModal({
    open,
    onClose,
    onApply,
    availableFields = [],
    rawTree = [],
    currentConfig = null,
    currentLayerId = null,
}) {
    const [tab, setTab] = useState('predefinidas');
    const [presetKey, setPresetKey] = useState(null);
    const [capaId, setCapaId] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    const presets = useMemo(
        () => INFOBOX_TEMPLATES.map((t) => ({ ...t, config: t.build(availableFields) })),
        [availableFields],
    );

    const capas = useMemo(
        () => recolectarCapas(rawTree).filter((c) => c.id !== currentLayerId),
        [rawTree, currentLayerId],
    );

    const capasFiltradas = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return capas;
        return capas.filter((c) => `${c.label} ${c.ruta} ${c.id}`.toLowerCase().includes(q));
    }, [capas, busqueda]);

    const elegida = tab === 'predefinidas'
        ? presets.find((p) => p.key === presetKey)?.config || null
        : capas.find((c) => c.id === capaId)?.config || null;

    const tieneConfig = !!currentConfig && Object.keys(currentConfig).length > 0;

    const aplicar = () => {
        if (!elegida) return;
        const copia = JSON.parse(JSON.stringify(elegida));
        const confirmar = () => { onApply(copia); onClose(); };
        if (!tieneConfig) { confirmar(); return; }
        Modal.confirm({
            title: '¿Reemplazar la tarjetita actual?',
            content: 'Esta capa ya tiene una tarjetita configurada y la plantilla la reemplaza por completo. Si te arrepientes, sal del editor sin guardar.',
            okText: 'Sí, reemplazar',
            cancelText: 'Cancelar',
            onOk: confirmar,
        });
    };

    const panelPredefinidas = (
        <div style={LISTA_STYLE}>
            {!availableFields.length && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 8 }}
                    message="No se pudieron leer las columnas de la capa"
                    description="Sin columnas no se puede armar una plantilla que apunte a datos reales. Revisa que la capa tenga workspace y feature type."
                />
            )}
            {presets.map((p) => (
                <Opcion
                    key={p.key}
                    titulo={p.nombre}
                    detalle={p.config ? p.resumen : 'Esta capa no tiene columnas que encajen con esta plantilla.'}
                    seleccionada={presetKey === p.key}
                    deshabilitada={!p.config}
                    onClick={() => setPresetKey(p.key)}
                />
            ))}
        </div>
    );

    const panelCapas = (
        <>
            <Input.Search
                allowClear
                placeholder="Buscar capa por nombre o ruta"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ marginBottom: 8 }}
            />
            <div style={LISTA_STYLE}>
                {capasFiltradas.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={capas.length ? 'Ninguna capa coincide' : 'Ninguna otra capa tiene tarjetita'}
                    />
                ) : capasFiltradas.map((c) => (
                    <Opcion
                        key={c.id}
                        titulo={c.label}
                        detalle={c.ruta}
                        extra={<Tag style={{ marginInlineEnd: 0, fontSize: 10 }}>{c.id}</Tag>}
                        seleccionada={capaId === c.id}
                        onClick={() => setCapaId(c.id)}
                    />
                ))}
            </div>
        </>
    );

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={aplicar}
            okText="Aplicar"
            cancelText="Cancelar"
            okButtonProps={{ disabled: !elegida }}
            title="Plantillas de tarjetita"
            width={880}
            destroyOnHidden
        >
            <Row gutter={20}>
                <Col xs={24} md={14}>
                    <Tabs
                        size="small"
                        activeKey={tab}
                        onChange={setTab}
                        items={[
                            { key: 'predefinidas', label: 'Predefinidas', children: panelPredefinidas },
                            { key: 'capa', label: 'Copiar de otra capa', children: panelCapas },
                        ]}
                    />
                </Col>
                <Col xs={24} md={10}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Vista previa</Text>
                    {elegida
                        ? <InfoBoxPreview value={elegida} />
                        : <Text type="secondary" style={{ fontSize: 12 }}>Elige una plantilla para verla.</Text>}
                </Col>
            </Row>
        </Modal>
    );
}
