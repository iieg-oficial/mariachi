import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Col, Modal, Row, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import {
    actualizarApiKey,
    crearEmbed,
    crearEmbedFromLayers,
    eliminarEmbed,
    listEmbeds,
    rotarApiKey,
} from '@features/mapalab-api-keys/api/mapalabApiKeysService';
import { message } from '@shared/services/message';
import { useLayerTree } from '@features/mapalab-api-keys/hooks/useLayerTree';
import { usePlaygroundMessageBridge } from '@features/mapalab-api-keys/hooks/usePlaygroundMessageBridge';
import PlaygroundConfigForm from './PlaygroundConfigForm';
import PlaygroundPreviewCard from './PlaygroundPreviewCard';
import SavedEmbedsList from './SavedEmbedsList';
import PlaygroundAlerts from './PlaygroundAlerts';
import {
    buildEmbedUrl,
    buildSnippet,
    defaultBaseUrl,
    matchesWildcard,
} from './playgroundHelpers';

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

    const apiKeyId = apiKey?.id;
    const apiKeyCapas = apiKey?.capasPermitidas;

    const sendViewToIframe = useCallback((view) => {
        if (!view) return;
        const win = iframeRef.current?.contentWindow;
        if (!win) return;
        try {
            win.postMessage({ type: 'mapalab:setview', payload: view }, '*');
        } catch { /* ignore */ }
    }, []);

    const fetchEmbeds = useCallback(async () => {
        if (!apiKeyId) return;
        setLoadingEmbeds(true);
        try {
            const data = await listEmbeds(apiKeyId);
            setEmbeds(Array.isArray(data) ? data : []);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron cargar los embeds');
        } finally {
            setLoadingEmbeds(false);
        }
    }, [apiKeyId]);

    useEffect(() => {
        if (initialPlainKey) setManualKey(initialPlainKey);
    }, [initialPlainKey]);

    useEffect(() => {
        if (apiKeyCapas?.length) setSelectedLayers(apiKeyCapas);
    }, [apiKeyId, apiKeyCapas]);

    useEffect(() => {
        if (apiKeyId) fetchEmbeds();
    }, [apiKeyId, fetchEmbeds]);

    usePlaygroundMessageBridge({
        baseUrl,
        pendingView,
        setPendingView,
        setCenter,
        setZoom,
        sendViewToIframe,
    });

    const doRotate = async () => {
        setRotating(true);
        try {
            const result = await rotarApiKey(apiKeyId);
            setManualKey(result.plainKey);
            try { sessionStorage.setItem(`mapalab_plain_${apiKeyId}`, result.plainKey); } catch { /* ignore */ }
            message.success('Contraseña nueva lista para previsualizar');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo generar la contraseña nueva');
        } finally {
            setRotating(false);
        }
    };

    const handleRotateAndPreview = () => Modal.confirm({
        title: '¿Generar una contraseña nueva para esta llave?',
        icon: <ExclamationCircleOutlined />,
        content: 'La contraseña actual queda inservible. Cualquier sitio que ya esté mostrando el mapa con la anterior dejará de funcionar hasta que la institución actualice el código en su página.',
        okText: 'Sí, generar nueva',
        cancelText: 'Cancelar',
        onOk: doRotate,
    });

    const previewKey = manualKey || (apiKey ? `${apiKey.keyPrefix}…` : '');
    const layersStr = selectedLayers.join(',');
    const trimmedShare = share.trim();
    const activeShare = mode === 'share' ? trimmedShare : '';
    const activeLayers = mode === 'layers' ? layersStr : '';
    const canSaveEmbed = mode === 'layers' ? selectedLayers.length > 0 : Boolean(trimmedShare);

    const adminOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const allowedDomains = apiKey?.dominiosPermitidos || [];
    const originAllowed = !adminOrigin || allowedDomains.some((d) => d === adminOrigin || matchesWildcard(d, adminOrigin));

    const allowedLayers = apiKey?.capasPermitidas || [];
    const layersRestricted = allowedLayers.length > 0;
    const missingLayers = mode === 'layers' && layersRestricted
        ? selectedLayers.filter((l) => !allowedLayers.includes(l))
        : [];

    const grantOrigin = async () => {
        if (!apiKeyId) return;
        setGrantingOrigin(true);
        try {
            const next = [...new Set([...allowedDomains, adminOrigin])];
            await actualizarApiKey(apiKeyId, { dominios_permitidos: next });
            message.success(`${adminOrigin} ya está autorizado`);
            window.location.reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo autorizar el sitio');
        } finally {
            setGrantingOrigin(false);
        }
    };

    const grantMissingLayers = async () => {
        if (!apiKeyId || missingLayers.length === 0) return;
        setGrantingLayers(true);
        try {
            const next = [...new Set([...allowedLayers, ...missingLayers])];
            await actualizarApiKey(apiKeyId, { capas_permitidas: next });
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

    const buildViewPayload = () => {
        const v = {};
        if (center) {
            const parts = center.split(',').map((s) => Number(s.trim()));
            if (parts.length === 2 && parts.every(Number.isFinite)) {
                v.lat = parts[0]; v.lon = parts[1];
            }
        }
        if (zoom) v.zoom = Number(zoom);
        return Object.keys(v).length ? v : null;
    };

    const handleSaveEmbed = async () => {
        if (!apiKeyId || !canSaveEmbed) return;
        setSaving(true);
        try {
            const labelPayload = embedLabel.trim() || null;
            if (mode === 'share') {
                await crearEmbed(apiKeyId, { shareId: trimmedShare, label: labelPayload });
            } else {
                await crearEmbedFromLayers(apiKeyId, {
                    layers: selectedLayers.map((slug) => ({ slug })),
                    view: buildViewPayload(),
                    label: labelPayload,
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
            await eliminarEmbed(apiKeyId, shareId);
            message.success('Mapa borrado de los guardados');
            fetchEmbeds();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo borrar el mapa');
        }
    };

    const handleLoadEmbed = (item) => {
        const summaryLayers = item.summary?.layers || [];
        const summaryView = item.summary?.view || null;
        if (summaryLayers.length > 0) {
            setMode('layers');
            setSelectedLayers(summaryLayers);
            setShare('');
            if (summaryView?.lat != null && summaryView.lon != null) {
                setCenter(`${summaryView.lat.toFixed(5)},${summaryView.lon.toFixed(5)}`);
            }
            if (typeof summaryView?.zoom === 'number') {
                setZoom(Math.round(summaryView.zoom * 10) / 10);
            }
            if (summaryView) {
                setPendingView(summaryView);
                sendViewToIframe(summaryView);
            }
        } else {
            setMode('share');
            setShare(item.shareId);
        }
        if (item.label) setEmbedLabel(item.label);
    };

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <PlaygroundAlerts
                originAllowed={originAllowed}
                adminOrigin={adminOrigin}
                grantingOrigin={grantingOrigin}
                onGrantOrigin={grantOrigin}
                missingLayers={missingLayers}
                labelByRef={labelByRef}
                grantingLayers={grantingLayers}
                onGrantLayers={grantMissingLayers}
                initialPlainKey={initialPlainKey}
            />

            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <PlaygroundConfigForm
                        manualKey={manualKey}
                        setManualKey={setManualKey}
                        mode={mode}
                        setMode={setMode}
                        selectedLayers={selectedLayers}
                        setSelectedLayers={setSelectedLayers}
                        share={share}
                        setShare={setShare}
                        center={center}
                        setCenter={setCenter}
                        zoom={zoom}
                        setZoom={setZoom}
                        height={height}
                        setHeight={setHeight}
                        baseUrl={baseUrl}
                        setBaseUrl={setBaseUrl}
                        embedLabel={embedLabel}
                        setEmbedLabel={setEmbedLabel}
                        saving={saving}
                        canSaveEmbed={canSaveEmbed}
                        onSaveEmbed={handleSaveEmbed}
                    />
                </Col>
                <Col xs={24} md={14}>
                    <PlaygroundPreviewCard
                        ref={iframeRef}
                        manualKey={manualKey}
                        activeShare={activeShare}
                        activeLayers={activeLayers}
                        embedUrl={embedUrl}
                        snippet={snippet}
                        height={height}
                        mode={mode}
                        rotating={rotating}
                        apiKey={apiKey}
                        onRotateAndPreview={handleRotateAndPreview}
                        onCopy={copy}
                    />
                </Col>
            </Row>

            <SavedEmbedsList
                embeds={embeds}
                loading={loadingEmbeds}
                labelByRef={labelByRef}
                apiKey={apiKey}
                baseUrl={baseUrl}
                onCopy={copy}
                onDelete={handleDeleteEmbed}
                onLoadEmbed={handleLoadEmbed}
            />
        </Space>
    );
}
