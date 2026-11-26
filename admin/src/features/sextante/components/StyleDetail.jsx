import { useCallback, useEffect, useState } from 'react';
import { Input, Space, Spin, Tooltip, Typography } from 'antd';
import {
    BgColorsOutlined,
    CloseOutlined,
    CodeOutlined,
    CopyOutlined,
    InfoCircleOutlined,
    ReloadOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import LegendPreview from '@features/mapalab-layers/components/sldEditor/LegendPreview';
import { getStyleDetail } from '@features/sextante/api/sextanteService';
import { batchErrorMessage, rowsFromStyle, saveXmlDraft } from '@features/sextante/api/stylesBatchService';
import DraftEditor from '@features/sextante/components/stylesBatch/DraftEditor';
import IconAction from '@features/sextante/components/stylesBatch/IconAction';
import { ACTION_GROUP_STYLE } from '@features/sextante/utils/actionGroup';
import StyleCompat from '@features/sextante/components/StyleCompat';
import { xmlError } from '@features/sextante/utils/xmlError';
import StyleMapPreview from '@features/sextante/components/StyleMapPreview';
import { message } from '@shared/services/message';

const { Text } = Typography;

const PREVIEW_TIP = 'La leyenda pega contra GeoServer, no contra el borrador: refresca tras aprobarlo para ver los cambios. '
    + 'El mapa sí pinta el XML mientras lo editas.';
const LIVE_DELAY = 600;

const BOX = {
    margin: 0,
    height: 360,
    overflow: 'auto',
    background: 'var(--ant-color-fill-quaternary)',
    borderRadius: 8,
    padding: 12,
    fontSize: 11,
    fontFamily: 'monospace',
    whiteSpace: 'pre',
    resize: 'none',
};

const HEAD = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 40, flexWrap: 'wrap' };
const COLUMN = { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 };

export default function StyleDetail({ alias, styleName, canEdit }) {
    const [result, setResult] = useState({ key: null, detail: null, error: null });
    const [reloadKey, setReloadKey] = useState(0);
    const [mode, setMode] = useState(null);
    const [draft, setDraft] = useState('');
    const [liveXml, setLiveXml] = useState(null);
    const [mapStatus, setMapStatus] = useState('loading');
    const [saving, setSaving] = useState(false);
    const key = `${alias}:${styleName}`;
    const loadRows = useCallback(() => rowsFromStyle(alias, styleName), [alias, styleName]);

    useEffect(() => {
        let active = true;
        getStyleDetail(alias, styleName)
            .then((detail) => { if (active) setResult({ key, detail, error: null }); })
            .catch((err) => {
                if (active) setResult({ key, detail: null, error: err?.response?.data?.detail || 'No se pudo cargar el estilo' });
            });
        return () => { active = false; };
    }, [alias, styleName, key, reloadKey]);

    useEffect(() => {
        if (mode !== 'xml') return undefined;
        const timer = setTimeout(() => { if (!xmlError(draft)) setLiveXml(draft); }, LIVE_DELAY);
        return () => clearTimeout(timer);
    }, [draft, mode]);

    if (result.key !== key) return <Spin />;
    if (result.error) return <Text type="danger">{result.error}</Text>;

    const { detail } = result;
    const editingXml = mode === 'xml';
    const shownXml = editingXml ? draft : detail.rawXml;
    const canEditColors = canEdit && detail.editable && detail.shape === 'choropleth';
    const canEditXml = canEdit && !detail.isGlobal;

    const copyXml = async () => {
        try {
            await navigator.clipboard.writeText(shownXml);
            message.success('SLD copiado');
        } catch {
            message.error('No se pudo copiar');
        }
    };

    const startXml = () => {
        setDraft(detail.rawXml);
        setLiveXml(null);
        setMode('xml');
    };

    const saveXml = async () => {
        setSaving(true);
        try {
            await saveXmlDraft({ alias, style: detail.styleName, layerName: detail.sharedBy?.[0], xml: draft });
            message.success('Borrador guardado en Sin publicar');
            setMode(null);
        } catch (err) {
            message.error(batchErrorMessage(err, 'No se pudo guardar'));
        } finally {
            setSaving(false);
        }
    };

    const actions = editingXml ? (
        <>
            <IconAction title="Copiar SLD" icon={<CopyOutlined />} onClick={copyXml} />
            <IconAction title="Cancelar la edición" icon={<CloseOutlined />} onClick={() => setMode(null)} />
            <IconAction
                title="Guardar borrador"
                icon={<SaveOutlined />}
                active
                loading={saving}
                disabled={!draft.trim() || draft === detail.rawXml || Boolean(xmlError(draft))}
                onClick={saveXml}
            />
        </>
    ) : (
        <>
            <IconAction title="Refrescar" icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)} />
            <IconAction title="Copiar SLD" icon={<CopyOutlined />} onClick={copyXml} />
            {canEditColors && (
                <IconAction
                    title="Editar colores y cortes"
                    icon={<BgColorsOutlined />}
                    active={mode === 'colores'}
                    onClick={() => setMode((prev) => (prev === 'colores' ? null : 'colores'))}
                />
            )}
            {canEditXml && <IconAction title="Editar el XML" icon={<CodeOutlined />} onClick={startXml} />}
        </>
    );

    const header = (
        <div style={HEAD}>
            <Space size={12} wrap>
                <Space size={6}>
                    <Text strong>Vista previa</Text>
                    <Tooltip title={PREVIEW_TIP}><InfoCircleOutlined aria-label={PREVIEW_TIP} /></Tooltip>
                </Space>
                <StyleCompat
                    xml={shownXml}
                    mapStatus={mapStatus}
                    hasLayer={Boolean(detail.sharedBy?.length)}
                    editable={detail.editable}
                    reason={detail.reason}
                />
            </Space>
        </div>
    );

    const sldHeader = (
        <div style={HEAD}>
            <Text strong>SLD</Text>
            <div role="group" aria-label="Acciones del estilo" style={ACTION_GROUP_STYLE}>{actions}</div>
        </div>
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            <div style={COLUMN}>
                {header}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'start' }}>
                    <StyleMapPreview
                        alias={alias}
                        layers={detail.sharedBy}
                        xml={editingXml && liveXml ? liveXml : detail.rawXml}
                        onStatus={setMapStatus}
                    />
                    {detail.sharedBy?.length > 0 && (
                        <LegendPreview
                            bare
                            refreshKey={reloadKey}
                            workspace={detail.workspace}
                            styleName={detail.styleName}
                            layerName={detail.sharedBy[0]}
                        />
                    )}
                </div>
            </div>
            <div style={COLUMN}>
                {sldHeader}
                {editingXml && (
                    <Input.TextArea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        spellCheck={false}
                        variant="borderless"
                        style={BOX}
                        aria-label="SLD en XML"
                    />
                )}
                {mode !== 'xml' && <pre style={BOX}>{detail.rawXml}</pre>}
            </div>
            {mode === 'colores' && (
                <div style={{ gridColumn: '1 / -1' }}>
                    <DraftEditor
                        load={loadRows}
                        savedText="Borrador guardado en Sin publicar"
                        onSaved={() => setMode(null)}
                        onCancel={() => setMode(null)}
                    />
                </div>
            )}
        </div>
    );
}
