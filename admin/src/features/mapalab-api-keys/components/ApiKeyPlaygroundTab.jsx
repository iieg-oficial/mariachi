import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Empty,
    Form,
    Input,
    InputNumber,
    List,
    Modal,
    Popconfirm,
    Radio,
    Row,
    Space,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    EyeOutlined,
    ReloadOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import {
    actualizarApiKey,
    crearEmbed,
    crearEmbedFromLayers,
    eliminarEmbed,
    listEmbeds,
    rotarApiKey,
} from '@features/mapalab-api-keys/api/mapalabApiKeysService';
import { message } from '@shared/services/message';
import LayerTreeSelect from '@features/mapalab-api-keys/components/LayerTreeSelect';
import { useLayerTree } from '@features/mapalab-api-keys/hooks/useLayerTree';

const { Paragraph, Text } = Typography;


const buildEmbedUrl = ({ baseUrl, key, share, layers }) => {
    const params = new URLSearchParams();
    if (key) params.set('key', key);
    if (share) {
        params.set('s', share);
    } else if (layers) {
        params.set('layers', layers);
    }
    return `${(baseUrl || '').replace(/\/$/, '')}/embed?${params.toString()}`;
};


const buildSnippet = ({ keyValue, share, layers, height, baseUrl }) => {
    const baseAttr = baseUrl ? `\n    base-url="${baseUrl}"` : '';
    const contentAttr = share
        ? `\n    share="${share}"`
        : `\n    layers="${layers || ''}"`;
    return [
        `<script src="${(baseUrl || 'https://mapalab.iieg.gob.mx').replace(/\/$/, '')}/widget/v1/mapalab.js" defer></script>`,
        ``,
        `<iieg-mapalab`,
        `    api-key="${keyValue || 'mk_pub_…'}"${contentAttr}${baseAttr}`,
        `    height="${height || 500}">`,
        `</iieg-mapalab>`,
    ].join('\n');
};


const defaultBaseUrl = () => (typeof window !== 'undefined' ? `${window.location.origin}/mapalab` : '');


export default function ApiKeyPlaygroundTab({ apiKey, initialPlainKey = '' }) {
    const [manualKey, setManualKey] = useState(initialPlainKey);
    const [mode, setMode] = useState('layers');
    const [share, setShare] = useState('');
    const [selectedLayers, setSelectedLayers] = useState(apiKey?.capasPermitidas || []);
    const [center, setCenter] = useState('');
    const [zoom, setZoom] = useState(8);
    const [height, setHeight] = useState(500);
    const [baseUrl, setBaseUrl] = useState(defaultBaseUrl());
    const [rotating, setRotating] = useState(false);
    const [embeds, setEmbeds] = useState([]);
    const [loadingEmbeds, setLoadingEmbeds] = useState(false);
    const [saving, setSaving] = useState(false);
    const [embedLabel, setEmbedLabel] = useState('');
    const [grantingOrigin, setGrantingOrigin] = useState(false);
    const [grantingLayers, setGrantingLayers] = useState(false);
    const [pendingView, setPendingView] = useState(null);
    const iframeRef = useRef(null);
    const { labelByRef } = useLayerTree();

    const sendViewToIframe = useCallback((view) => {
        if (!view) return;
        const win = iframeRef.current?.contentWindow;
        if (!win) return;
        try {
            win.postMessage({ type: 'mapalab:setview', payload: view }, '*');
        } catch { /* ignore */ }
    }, []);

    const fetchEmbeds = useCallback(async () => {
        if (!apiKey?.id) return;
        setLoadingEmbeds(true);
        try {
            const data = await listEmbeds(apiKey.id);
            setEmbeds(Array.isArray(data) ? data : []);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron cargar los embeds');
        } finally {
            setLoadingEmbeds(false);
        }
    }, [apiKey?.id]);

    useEffect(() => {
        if (initialPlainKey) setManualKey(initialPlainKey);
    }, [initialPlainKey]);

    useEffect(() => {
        if (apiKey?.capasPermitidas?.length) {
            setSelectedLayers(apiKey.capasPermitidas);
        }
    }, [apiKey?.id, apiKey?.capasPermitidas]);

    useEffect(() => {
        if (apiKey?.id) fetchEmbeds();
    }, [apiKey?.id, fetchEmbeds]);

    useEffect(() => {
        const expectedOrigin = (() => {
            try {
                return new URL(baseUrl, window.location.origin).origin;
            } catch {
                return null;
            }
        })();
        const handler = (event) => {
            if (expectedOrigin && event.origin && event.origin !== expectedOrigin) return;
            const data = event?.data;
            if (!data || typeof data !== 'object') return;
            if (data.type === 'mapalab:viewchange') {
                const p = data.payload || {};
                if (typeof p.lon === 'number' && typeof p.lat === 'number') {
                    setCenter(`${p.lat.toFixed(5)},${p.lon.toFixed(5)}`);
                }
                if (typeof p.zoom === 'number') {
                    setZoom(Math.round(p.zoom * 10) / 10);
                }
            } else if (data.type === 'mapalab:ready') {
                if (pendingView) {
                    sendViewToIframe(pendingView);
                    setPendingView(null);
                }
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [baseUrl, pendingView, sendViewToIframe]);

    const handleRotateAndPreview = () => {
        Modal.confirm({
            title: '¿Generar una contraseña nueva para esta llave?',
            icon: <ExclamationCircleOutlined />,
            content: 'La contraseña actual queda inservible. Cualquier sitio que ya esté mostrando el mapa con la anterior dejará de funcionar hasta que la institución actualice el código en su página.',
            okText: 'Sí, generar nueva',
            cancelText: 'Cancelar',
            onOk: async () => {
                setRotating(true);
                try {
                    const result = await rotarApiKey(apiKey.id);
                    setManualKey(result.plainKey);
                    try {
                        sessionStorage.setItem(`mapalab_plain_${apiKey.id}`, result.plainKey);
                    } catch { /* ignore */ }
                    message.success('Contraseña nueva lista para previsualizar');
                } catch (err) {
                    message.error(err?.response?.data?.detail || 'No se pudo generar la contraseña nueva');
                } finally {
                    setRotating(false);
                }
            },
        });
    };

    const previewKey = manualKey || (apiKey ? `${apiKey.keyPrefix}…` : '');
    const layersStr = selectedLayers.join(',');
    const trimmedShare = share.trim();
    const activeShare = mode === 'share' ? trimmedShare : '';
    const activeLayers = mode === 'layers' ? layersStr : '';
    const canSaveEmbed = mode === 'layers' ? selectedLayers.length > 0 : Boolean(trimmedShare);

    const adminOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const allowedDomains = apiKey?.dominiosPermitidos || [];
    const matchesWildcard = (pattern, origin) => {
        if (!pattern || !origin) return false;
        const clean = pattern.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const originClean = origin.replace(/^https?:\/\//, '');
        if (clean === '*') return true;
        if (clean === originClean) return true;
        if (clean.startsWith('*.')) {
            const base = clean.slice(2);
            return originClean === base || originClean.endsWith('.' + base);
        }
        return false;
    };
    const originAllowed = !adminOrigin || allowedDomains.some((d) => d === adminOrigin || matchesWildcard(d, adminOrigin));

    const allowedLayers = apiKey?.capasPermitidas || [];
    const layersRestricted = allowedLayers.length > 0;
    const missingLayers = mode === 'layers' && layersRestricted
        ? selectedLayers.filter((l) => !allowedLayers.includes(l))
        : [];

    const grantOrigin = async () => {
        if (!apiKey?.id) return;
        setGrantingOrigin(true);
        try {
            const next = [...new Set([...allowedDomains, adminOrigin])];
            await actualizarApiKey(apiKey.id, { dominios_permitidos: next });
            message.success(`${adminOrigin} ya está autorizado`);
            window.location.reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo autorizar el sitio');
        } finally {
            setGrantingOrigin(false);
        }
    };

    const grantMissingLayers = async () => {
        if (!apiKey?.id || missingLayers.length === 0) return;
        setGrantingLayers(true);
        try {
            const next = [...new Set([...allowedLayers, ...missingLayers])];
            await actualizarApiKey(apiKey.id, { capas_permitidas: next });
            message.success(`${missingLayers.length} capa(s) autorizadas para esta llave`);
            window.location.reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron autorizar las capas');
        } finally {
            setGrantingLayers(false);
        }
    };

    const embedUrl = useMemo(
        () => buildEmbedUrl({ baseUrl, key: manualKey, share: activeShare, layers: activeLayers }),
        [baseUrl, manualKey, activeShare, activeLayers],
    );
    const snippet = useMemo(
        () => buildSnippet({ keyValue: previewKey, share: activeShare, layers: activeLayers, height, baseUrl }),
        [previewKey, activeShare, activeLayers, height, baseUrl],
    );

    const copy = (text, label = 'Copiado') => {
        navigator.clipboard.writeText(text).then(
            () => message.success(label),
            () => message.error('No se pudo copiar'),
        );
    };

    const handleSaveEmbed = async () => {
        if (!apiKey?.id || !canSaveEmbed) return;
        setSaving(true);
        try {
            if (mode === 'share') {
                await crearEmbed(apiKey.id, {
                    shareId: trimmedShare,
                    label: embedLabel.trim() || null,
                });
            } else {
                const layersPayload = selectedLayers.map((slug) => ({ slug }));
                const viewPayload = {};
                if (center) {
                    const parts = center.split(',').map((s) => Number(s.trim()));
                    if (parts.length === 2 && parts.every(Number.isFinite)) {
                        viewPayload.lat = parts[0];
                        viewPayload.lon = parts[1];
                    }
                }
                if (zoom) viewPayload.zoom = Number(zoom);
                await crearEmbedFromLayers(apiKey.id, {
                    layers: layersPayload,
                    view: Object.keys(viewPayload).length ? viewPayload : null,
                    label: embedLabel.trim() || null,
                });
            }
            message.success('Mapa guardado correctamente (no expira)');
            setEmbedLabel('');
            fetchEmbeds();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo guardar el mapa');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEmbed = async (shareId) => {
        try {
            await eliminarEmbed(apiKey.id, shareId);
            message.success('Mapa borrado de los guardados');
            fetchEmbeds();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo borrar el mapa');
        }
    };

    const buildPersistedSnippet = (item) => buildSnippet({
        keyValue: `${apiKey.keyPrefix}…`,
        share: item.shareId,
        height: 500,
        baseUrl,
    });

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {!originAllowed && adminOrigin && (
                <Alert
                    type="warning"
                    showIcon
                    closable
                    message={`Esta página (${adminOrigin}) no está autorizada para mostrar el mapa con esta llave`}
                    description="Mientras no esté autorizada, la previsualización va a fallar. Puedes agregarla con un click."
                    action={
                        <Button
                            type="primary"
                            size="small"
                            loading={grantingOrigin}
                            onClick={grantOrigin}
                        >
                            Autorizar esta página
                        </Button>
                    }
                />
            )}
            {missingLayers.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    closable
                    message={`${missingLayers.length} capa(s) no están autorizadas para esta llave`}
                    description={`Capas faltantes: ${missingLayers.map((l) => labelByRef[l] || l).join(', ')}. La llave debe autorizarlas para poder mostrarlas en el mapa.`}
                    action={
                        <Button
                            type="primary"
                            size="small"
                            loading={grantingLayers}
                            onClick={grantMissingLayers}
                        >
                            Autorizar capas faltantes
                        </Button>
                    }
                />
            )}
            {!initialPlainKey && (
                <Alert
                    type="info"
                    showIcon
                    closable
                    message="Pega la contraseña completa de la llave para previsualizar"
                    description="Por seguridad, solo guardamos un resumen de la contraseña. Si la acabas de crear, cópiala del aviso que apareció. Si ya no la tienes, puedes generar una nueva desde el menú de tres puntos (⋮) → 'Generar contraseña nueva'."
                />
            )}

            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <Card title="Configura el mapa que quieres mostrar" size="small">
                        <Form layout="vertical" size="small">
                            <Form.Item
                                label="Contraseña completa de la llave"
                                tooltip="Pega aquí la contraseña que se mostró cuando creaste o renovaste la llave. Solo se usa para previsualizar; no se guarda en ningún lado."
                            >
                                <Input.Password
                                    placeholder="Ejemplo: mk_pub_kRrt--DdlbJCIs…"
                                    value={manualKey}
                                    onChange={(e) => setManualKey(e.target.value)}
                                />
                            </Form.Item>

                            <Form.Item
                                label="¿Cómo quieres armar el mapa?"
                                tooltip="Por capas: tú eliges qué capas mostrar y cómo se ve. Por código: pegas un código corto que reproduce un mapa que alguien ya armó en el visor MapaLab."
                            >
                                <Radio.Group
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value)}
                                    optionType="button"
                                    buttonStyle="solid"
                                >
                                    <Radio.Button value="layers">Eligiendo capas</Radio.Button>
                                    <Radio.Button value="share">Con un código de mapa</Radio.Button>
                                </Radio.Group>
                            </Form.Item>

                            {mode === 'layers' ? (
                                <>
                                    <Form.Item
                                        label="Capas a mostrar"
                                        tooltip="Las capas son la información que se va a dibujar sobre el mapa base (por ejemplo: límites de municipios, hospitales, cultivos, indicadores sociales, etc.). Puedes seleccionar varias y se mostrarán encimadas en el mismo mapa."
                                    >
                                        <LayerTreeSelect
                                            value={selectedLayers}
                                            onChange={setSelectedLayers}
                                            placeholder="Busca o expande las categorías para elegir capas"
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        label="Vista inicial del mapa (centro y nivel de acercamiento)"
                                        tooltip="Es la ubicación y qué tan cerca se ve el mapa cuando alguien lo abre por primera vez. La forma más fácil de ajustarla es mover y hacer zoom en la previsualización de la derecha; estos valores se llenan solos."
                                        extra={<Text type="secondary" style={{ fontSize: 11 }}>Estos valores se actualizan automáticamente al mover el mapa de la derecha. También puedes ajustarlos a mano.</Text>}
                                    >
                                        <Row gutter={[8, 8]}>
                                            <Col xs={24} sm={16}>
                                                <Input
                                                    value={center}
                                                    onChange={(e) => setCenter(e.target.value)}
                                                    placeholder="Ejemplo: 20.67,-103.35"
                                                    addonBefore="Centro"
                                                />
                                            </Col>
                                            <Col xs={24} sm={8}>
                                                <InputNumber
                                                    min={1}
                                                    max={20}
                                                    step={0.5}
                                                    value={zoom}
                                                    onChange={setZoom}
                                                    style={{ width: '100%' }}
                                                    addonBefore="Acercamiento"
                                                    placeholder="Ejemplo: 9"
                                                />
                                            </Col>
                                        </Row>
                                    </Form.Item>
                                </>
                            ) : (
                                <Form.Item
                                    label="Código del mapa guardado"
                                    tooltip="Es el código corto (10 letras y números) que aparece en el visor MapaLab cuando alguien hace click en 'Compartir'. Si la institución te lo envió, pégalo aquí."
                                    extra={<Text type="secondary" style={{ fontSize: 11 }}>El código reproduce un mapa exactamente como lo armó quien lo compartió (mismas capas, mismos filtros, misma vista).</Text>}
                                >
                                    <Input
                                        value={share}
                                        onChange={(e) => setShare(e.target.value)}
                                        placeholder="Ejemplo: zoqpv4eu2t"
                                        maxLength={10}
                                        allowClear
                                    />
                                </Form.Item>
                            )}

                            <Row gutter={[8, 8]}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label="Altura del mapa en la página (en píxeles)"
                                        tooltip="Qué tan alto se va a ver el mapa cuando esté embebido. Un valor típico es 500 píxeles (medio espacio de pantalla)."
                                    >
                                        <InputNumber
                                            min={200}
                                            max={2000}
                                            value={height}
                                            onChange={setHeight}
                                            style={{ width: '100%' }}
                                            placeholder="Ejemplo: 500"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label="Dirección del visor MapaLab"
                                        tooltip="Es la página de IIEG que sirve el visor. Normalmente no necesitas cambiarlo; solo ajústalo si estás probando contra otro entorno."
                                    >
                                        <Input
                                            value={baseUrl}
                                            onChange={(e) => setBaseUrl(e.target.value)}
                                            placeholder="Ejemplo: https://iieg.gob.mx/mapalab"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                label="Nombre para identificar este mapa después"
                                tooltip="Solo aparece en este panel administrativo. Te ayuda a recordar qué muestra cada mapa guardado sin tener que abrirlo."
                            >
                                <Input
                                    value={embedLabel}
                                    onChange={(e) => setEmbedLabel(e.target.value)}
                                    placeholder="Ejemplo: Cultivos Jalisco — sección Estadísticas"
                                    maxLength={150}
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={saving}
                                disabled={!canSaveEmbed}
                                onClick={handleSaveEmbed}
                                block
                            >
                                Guardar este mapa para usarlo después
                            </Button>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                                Queda guardado en la lista de abajo y nunca expira mientras siga vinculado a esta llave.
                            </Text>
                        </Form>
                    </Card>
                </Col>
                <Col xs={24} md={14}>
                    <Card
                        size="small"
                        title="Así se va a ver el mapa"
                        extra={
                            <Button size="small" icon={<CopyOutlined />} onClick={() => copy(snippet, 'Código copiado')}>
                                Copiar código para pegar
                            </Button>
                        }
                        bodyStyle={{ padding: 0 }}
                    >
                        {manualKey && (activeShare || activeLayers) ? (
                            <iframe
                                ref={iframeRef}
                                title="Previsualización del mapa"
                                src={embedUrl}
                                style={{ width: '100%', height: `${height}px`, border: 0, display: 'block' }}
                            />
                        ) : (
                            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                                {!manualKey ? (
                                    <Space direction="vertical" size="middle" align="center">
                                        <Text type="secondary">No tenemos guardada la contraseña completa de esta llave (por seguridad solo guardamos un resumen).</Text>
                                        <Button
                                            type="primary"
                                            icon={<ReloadOutlined />}
                                            loading={rotating}
                                            onClick={handleRotateAndPreview}
                                            disabled={!apiKey?.id}
                                        >
                                            Generar una contraseña nueva para probar
                                        </Button>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            Si ya tienes la contraseña a la mano, pégala arriba. Generar una nueva reemplaza la anterior: los sitios que ya la usen van a dejar de funcionar hasta actualizarla.
                                        </Text>
                                    </Space>
                                ) : mode === 'layers'
                                    ? 'Selecciona al menos una capa para que aparezca el mapa.'
                                    : 'Pega el código del mapa guardado para previsualizarlo.'}
                            </div>
                        )}
                    </Card>
                    <Card title="Código listo para pegar en tu página" size="small" style={{ marginTop: 12 }}>
                        <Paragraph
                            type="secondary"
                            style={{ fontSize: 11, marginBottom: 8 }}
                        >
                            Copia este código y pégalo en el HTML de la página donde quieres mostrar el mapa.
                        </Paragraph>
                        <Paragraph
                            copyable={{ text: snippet, tooltips: 'Copiar código' }}
                            style={{
                                background: '#fafafa',
                                padding: 12,
                                borderRadius: 6,
                                fontFamily: 'monospace',
                                fontSize: 12,
                                whiteSpace: 'pre',
                                marginBottom: 0,
                            }}
                        >
                            {snippet}
                        </Paragraph>
                    </Card>
                </Col>
            </Row>

            <Card title="Mapas guardados (no expiran)" size="small">
                <List
                    loading={loadingEmbeds}
                    dataSource={embeds}
                    locale={{ emptyText: <Empty description="Todavía no hay mapas guardados. Arma uno arriba y dale 'Guardar este mapa'." /> }}
                    renderItem={(item) => {
                        const persistedSnippet = buildPersistedSnippet(item);
                        const layerSlugs = item.summary?.layers || [];
                        const layerLabels = layerSlugs.map((s) => labelByRef[s] || s);
                        const view = item.summary?.view || null;
                        return (
                            <List.Item
                                key={item.id}
                                actions={[
                                    <Tooltip key="load" title="Cargar este mapa para volver a verlo o editarlo">
                                        <Button
                                            size="small"
                                            icon={<EyeOutlined />}
                                            onClick={() => {
                                                const summaryLayers = item.summary?.layers || [];
                                                const summaryView = item.summary?.view || null;
                                                if (summaryLayers.length > 0) {
                                                    setMode('layers');
                                                    setSelectedLayers(summaryLayers);
                                                    setShare('');
                                                    let centerMsg = '';
                                                    if (summaryView && typeof summaryView.lat === 'number' && typeof summaryView.lon === 'number') {
                                                        const centerStr = `${summaryView.lat.toFixed(5)},${summaryView.lon.toFixed(5)}`;
                                                        setCenter(centerStr);
                                                        centerMsg = ` · centro ${centerStr}`;
                                                    }
                                                    let zoomMsg = '';
                                                    if (summaryView && typeof summaryView.zoom === 'number') {
                                                        const z = Math.round(summaryView.zoom * 10) / 10;
                                                        setZoom(z);
                                                        zoomMsg = ` · zoom ${z}`;
                                                    }
                                                    if (summaryView) {
                                                        setPendingView(summaryView);
                                                        sendViewToIframe(summaryView);
                                                    }
                                                    message.success(`Mapa cargado: ${summaryLayers.length} capas${centerMsg}${zoomMsg}`);
                                                } else {
                                                    setMode('share');
                                                    setShare(item.shareId);
                                                    message.success(`Mapa con código ${item.shareId} cargado para previsualizar`);
                                                }
                                                if (item.label) setEmbedLabel(item.label);
                                                if (typeof window !== 'undefined') {
                                                    setTimeout(() => {
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }, 50);
                                                }
                                            }}
                                        />
                                    </Tooltip>,
                                    <Tooltip key="copy" title="Copiar código para pegar en una página">
                                        <Button
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() => copy(persistedSnippet, 'Código copiado')}
                                        />
                                    </Tooltip>,
                                    <Popconfirm
                                        key="del"
                                        title="¿Borrar este mapa guardado?"
                                        description="Se quita la protección de permanencia. Si nadie lo está usando, el mapa va a desaparecer después de 90 días sin uso."
                                        okText="Sí, borrar"
                                        cancelText="Cancelar"
                                        okButtonProps={{ danger: true }}
                                        onConfirm={() => handleDeleteEmbed(item.shareId)}
                                    >
                                        <Tooltip title="Borrar este mapa guardado">
                                            <Button size="small" danger icon={<DeleteOutlined />} />
                                        </Tooltip>
                                    </Popconfirm>,
                                ]}
                            >
                                <List.Item.Meta
                                    title={
                                        <Space size="small" wrap>
                                            <Text strong>{item.label || `Mapa del ${new Date(item.creadoEn).toLocaleDateString('es-MX')}`}</Text>
                                            {item.permanent && <Tag color="green">Permanente</Tag>}
                                            {!item.shareExists && <Tag color="red">Ya no disponible</Tag>}
                                        </Space>
                                    }
                                    description={
                                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                            {layerLabels.length > 0 && (
                                                <Space size={4} wrap>
                                                    {layerLabels.slice(0, 5).map((l, i) => (
                                                        <Tag key={`${l}-${i}`} color="blue">{l}</Tag>
                                                    ))}
                                                    {layerLabels.length > 5 && (
                                                        <Tooltip title={layerLabels.slice(5).join(', ')}>
                                                            <Tag>+{layerLabels.length - 5}</Tag>
                                                        </Tooltip>
                                                    )}
                                                </Space>
                                            )}
                                            {view && (typeof view.lat === 'number' || typeof view.zoom === 'number') && (
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {typeof view.lat === 'number' && typeof view.lon === 'number' && (
                                                        <>Centro: {view.lat.toFixed(3)}, {view.lon.toFixed(3)} · </>
                                                    )}
                                                    {typeof view.zoom === 'number' && <>Acercamiento: {view.zoom}</>}
                                                </Text>
                                            )}
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                Guardado: {new Date(item.creadoEn).toLocaleString('es-MX')} · Código <Text code style={{ fontSize: 10 }}>{item.shareId}</Text>
                                            </Text>
                                        </Space>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            </Card>
        </Space>
    );
}
