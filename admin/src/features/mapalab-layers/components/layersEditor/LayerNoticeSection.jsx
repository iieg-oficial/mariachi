import {
    Alert,
    Card,
    Col,
    DatePicker,
    Divider,
    Form,
    Input,
    Radio,
    Row,
    Select,
    Space,
    Switch,
    Tag,
    Typography,
} from 'antd';
import dayjs from 'dayjs';
import { BellOutlined, ExclamationCircleOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import NoticeIconField from './NoticeIconField';
import NoticeAnchorField from './NoticeAnchorField';
import ZoomRangeField from '@shared/components/ZoomRangeField';
import MarkdownTextArea from '@shared/components/MarkdownTextArea';
import { renderInlineMarkdown } from '@shared/utils/inlineMarkdown';

const GEOSERVER_BASE = '/geoserver';

const isValidHttpUrl = (value) => {
    if (!value) return true;
    try {
        const u = new URL(value);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
};

const { Text, Paragraph } = Typography;

export const NOTICE_VARIANTS = [
    { value: 'info', label: 'Informativo (morado)' },
    { value: 'warning', label: 'Atención (naranja)' },
    { value: 'neutral', label: 'Neutral (gris)' },
    { value: 'banner', label: 'Banner (franja superior)' },
];

export const NOTICE_SIZES = [
    { value: 'compact', label: 'Mínimo' },
    { value: 'small', label: 'Compacto' },
    { value: 'medium', label: 'Estándar' },
    { value: 'large', label: 'Destacado (recomendado)' },
];

export const NOTICE_POSITIONS = [
    { value: 'top-center', label: 'Arriba centro' },
    { value: 'bottom-center', label: 'Abajo centro' },
];

const DISMISS_PERSISTENCE_HELP = {
    permanent: 'El aviso queda cerrado para siempre en el navegador (localStorage). Sólo vuelve a aparecer si editas el texto, descripción, ícono, variante o enlace del aviso (el navegador detecta el cambio como un aviso nuevo).',
    reopen: 'El aviso vuelve a aparecer cuando: (a) el usuario recarga la página, o (b) desactiva la capa y la vuelve a activar. Útil para avisos que el visitante puede ignorar momentáneamente pero queremos que vea cada vez que entra al tema.',
};

export const NOTICE_ARROW_POSITIONS = [
    { value: 'bottom', label: 'Abajo (aviso sobre el punto)' },
    { value: 'top', label: 'Arriba (aviso bajo el punto)' },
    { value: 'left', label: 'Izquierda (aviso a la derecha del punto)' },
    { value: 'right', label: 'Derecha (aviso a la izquierda del punto)' },
];

const variantPreviewStyles = {
    info: { border: '2px solid #5C2472', titleColor: '#5C2472', accent: '#5C2472', icon: <InfoCircleOutlined style={{ color: '#5C2472', fontSize: 40 }} /> },
    warning: { border: '2px solid #FF8300', titleColor: '#FF8300', accent: '#FF8300', icon: <ExclamationCircleOutlined style={{ color: '#FF8300', fontSize: 40 }} /> },
    neutral: { border: 'none', titleColor: '#465055', accent: '#FFFFFF', icon: <BellOutlined style={{ color: '#9CA3AF', fontSize: 40 }} /> },
};

const PREVIEW_ARROW_SIZE = 30;

const previewArrowStyle = (position, color) => {
    const t = `${PREVIEW_ARROW_SIZE}px solid transparent`;
    const s = `${PREVIEW_ARROW_SIZE}px solid ${color}`;
    switch (position) {
    case 'top':
        return { position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: -PREVIEW_ARROW_SIZE, width: 0, height: 0, borderLeft: t, borderRight: t, borderBottom: s };
    case 'left':
        return { position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: -PREVIEW_ARROW_SIZE, width: 0, height: 0, borderTop: t, borderBottom: t, borderRight: s };
    case 'right':
        return { position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: -PREVIEW_ARROW_SIZE, width: 0, height: 0, borderTop: t, borderBottom: t, borderLeft: s };
    case 'bottom':
    default:
        return { position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -PREVIEW_ARROW_SIZE, width: 0, height: 0, borderLeft: t, borderRight: t, borderTop: s };
    }
};

function NoticePreview({ value }) {
    const variant = value?.variant || 'info';
    if (variant === 'banner') {
        const rawTitle = value?.title || 'Título del aviso';
        const rawDescription = value?.description || '';
        return (
            <div style={{ width: '100%' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'white',
                    borderRadius: 8,
                    boxShadow: '0px 3px 24px #00000029',
                    overflow: 'hidden',
                    minHeight: 44,
                }}>
                    <div style={{ flex: 1, padding: '8px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 14, color: '#465055', fontWeight: 500 }}>
                        {renderInlineMarkdown(rawTitle)}
                        {rawDescription && <> — {renderInlineMarkdown(rawDescription)}</>}
                    </div>
                    <span style={{ marginRight: 12, fontSize: 18, color: '#465055', fontWeight: 700, cursor: 'pointer' }}>×</span>
                </div>
                <PreviewMetadata value={value} />
            </div>
        );
    }
    const styles = variantPreviewStyles[variant] || variantPreviewStyles.info;
    const icon = value?.icon;
    const isUrl = typeof icon === 'string' && /^(https?:\/\/|\/acervo\/|\/api\/)/.test(icon);
    const anchored = value?.anchorMode === 'coord';
    const arrowPos = value?.arrowPosition || 'bottom';
    const arrowMargin = anchored ? {
        marginBottom: arrowPos === 'bottom' ? PREVIEW_ARROW_SIZE : 0,
        marginTop: arrowPos === 'top' ? PREVIEW_ARROW_SIZE : 0,
        marginLeft: arrowPos === 'left' ? PREVIEW_ARROW_SIZE : 0,
        marginRight: arrowPos === 'right' ? PREVIEW_ARROW_SIZE : 0,
    } : {};
    const size = value?.size || 'large';
    const sizePreset = {
        compact: { iconSize: 32, titleSize: 14, titleLh: 18, descSize: 12, descLh: 16, padding: '10px 12px', gap: 10, maxWidth: 300 },
        small: { iconSize: 40, titleSize: 14, titleLh: 20, descSize: 12, descLh: 16, padding: '12px 14px', gap: 12, maxWidth: 360 },
        medium: { iconSize: 56, titleSize: 16, titleLh: 24, descSize: 13, descLh: 18, padding: '16px 16px', gap: 14, maxWidth: 440 },
        large: { iconSize: 74, titleSize: 18, titleLh: 26, descSize: 14, descLh: 20, padding: '20px 16px', gap: 16, maxWidth: 507 },
    }[size] || {
        large: true, iconSize: 74, titleSize: 18, titleLh: 26, descSize: 14, descLh: 20, padding: '20px 16px', gap: 16, maxWidth: 507,
    };

    return (
        <div style={{ display: 'inline-block', maxWidth: sizePreset.maxWidth, width: '100%' }}>
            <div style={{ position: 'relative', ...arrowMargin }}>
                <div
                    style={{
                        width: '100%',
                        borderRadius: 8,
                        background: 'white',
                        padding: sizePreset.padding,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: sizePreset.gap,
                        border: styles.border,
                        boxShadow: '0px 3px 24px #00000029',
                    }}
                >
                    {icon
                        ? (isUrl
                            ? <img src={icon} alt="" style={{ width: sizePreset.iconSize, height: sizePreset.iconSize, objectFit: 'contain', flexShrink: 0, alignSelf: 'center' }} />
                            : <span style={{ lineHeight: 1, flexShrink: 0, alignSelf: 'center' }}>{styles.icon}</span>
                        )
                        : null
                    }
                    <div style={{ minWidth: 0, flex: 1, alignSelf: 'center' }}>
                        <div style={{ fontWeight: 700, color: styles.titleColor, fontSize: sizePreset.titleSize, lineHeight: `${sizePreset.titleLh}px` }}>
                            {renderInlineMarkdown(value?.title || 'Título del aviso')}
                        </div>
                        {value?.description && (
                            <div style={{ color: '#465055', fontSize: sizePreset.descSize, lineHeight: `${sizePreset.descLh}px`, marginTop: 4, fontWeight: 500 }}>
                                {renderInlineMarkdown(value.description)}
                            </div>
                        )}
                        {value?.cta?.label && value?.cta?.url && (
                            <div style={{ marginTop: 6 }}>
                                <Text style={{ color: '#5C2472', fontSize: 12, textDecoration: 'underline', fontWeight: 700 }}>
                                    {value.cta.label} →
                                </Text>
                            </div>
                        )}
                    </div>
                    {value?.dismissible !== false && (
                        <span style={{
                            alignSelf: 'center',
                            width: 24, height: 24,
                            borderRadius: '50%',
                            background: '#F0F0F0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#465055',
                            fontSize: 14,
                            fontWeight: 700,
                            flexShrink: 0,
                        }}>×</span>
                    )}
                </div>
                {anchored && (
                    <div
                        aria-hidden="true"
                        style={{
                            ...previewArrowStyle(arrowPos, styles.accent),
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                        }}
                    />
                )}
            </div>
            <PreviewMetadata value={value} />
        </div>
    );
}

function PreviewMetadata({ value }) {
    const tags = [];
    if (value?.validFrom) tags.push({ key: 'from', color: 'blue', label: `Desde ${value.validFrom}` });
    if (value?.validUntil) tags.push({ key: 'until', color: 'blue', label: `Hasta ${value.validUntil}` });
    if (!value?.validFrom && !value?.validUntil) tags.push({ key: 'always', color: 'default', label: 'Permanente' });
    const persistence = value?.dismissPersistence || 'permanent';
    const persistenceLabels = {
        permanent: 'Cierre permanente',
        session: 'Cierre por sesión',
        reopen: 'Reaparece al reactivar',
    };
    if (value?.dismissible !== false) {
        tags.push({ key: 'p', color: 'purple', label: persistenceLabels[persistence] });
    } else {
        tags.push({ key: 'p', color: 'red', label: 'No descartable' });
    }
    if (value?.zoomRange?.min != null || value?.zoomRange?.max != null) {
        const min = value.zoomRange?.min ?? '−∞';
        const max = value.zoomRange?.max ?? '+∞';
        tags.push({ key: 'z', color: 'cyan', label: `Zoom ${min} – ${max}` });
    }
    if (value?.anchorMode === 'coord' && value?.anchorCoord) {
        tags.push({ key: 'a', color: 'gold', label: `Anclado (lon ${value.anchorCoord.lon}, lat ${value.anchorCoord.lat})` });
    }
    return (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map((t) => (
                <Tag key={t.key} color={t.color} style={{ margin: 0, fontSize: 11 }}>{t.label}</Tag>
            ))}
        </div>
    );
}

export default function LayerNoticeSection({
    value,
    onChange,
    geoserverWorkspace,
    geoserverLayer,
    styles,
    cqlFilter,
    defaultZoom,
    previewSticky = true,
    previewStickyTop = 0,
}) {
    const safeValue = value || null;
    const enabled = Boolean(safeValue?.enabled);
    const anchorMode = safeValue?.anchorMode || 'viewport';

    const setField = (patch) => {
        const base = safeValue || {
            enabled: false,
            title: '',
            variant: 'info',
            position: 'top-center',
            dismissible: true,
        };
        onChange?.({ ...base, ...patch });
    };

    const validFromValue = safeValue?.validFrom ? dayjs(safeValue.validFrom) : null;
    const validUntilValue = safeValue?.validUntil ? dayjs(safeValue.validUntil) : null;

    const setCta = (patch) => {
        const cta = { ...(safeValue?.cta || {}), ...patch };
        if (!cta.label && !cta.url) {
            setField({ cta: null });
        } else {
            setField({ cta });
        }
    };

    return (
        <div>
            <Form.Item label={<Text strong>Habilitar aviso</Text>} style={{ marginBottom: 16 }}>
                <Switch
                    checked={enabled}
                    onChange={(checked) => setField({ enabled: checked, title: safeValue?.title || '' })}
                />
                <Text type="secondary" style={{ marginLeft: 12 }}>
                    {enabled ? 'El aviso se mostrará en el visor.' : 'Apagado (no se muestra al usuario).'}
                </Text>
            </Form.Item>

            {enabled && !safeValue?.title?.trim() && (
                <Alert
                    type="warning"
                    showIcon
                    closable
                    icon={<WarningOutlined />}
                    style={{ marginBottom: 16 }}
                    message="Aviso activado sin título"
                    description="El aviso está habilitado pero el título está vacío. El visor lo ignorará silenciosamente hasta que escribas un título."
                />
            )}

            {enabled ? (
                <Row gutter={24}>
                    <Col xs={24} md={14}>
                        <Card size="small" title="Contenido" style={{ marginBottom: 16 }}>
                            {safeValue?.variant === 'banner' ? (
                                <Form.Item
                                    label="Mensaje del banner"
                                    required
                                    help="Texto único del banner (máx 500 caracteres). Soporta **negritas**, *cursivas*, ~~tachado~~ y [enlaces](url)."
                                >
                                    <MarkdownTextArea
                                        rows={3}
                                        maxLength={500}
                                        showCount
                                        value={safeValue?.title || ''}
                                        onChange={(v) => setField({ title: v, description: null })}
                                        placeholder="Ej. El ingreso a esta área será únicamente para personas que cuenten con boleto al estadio."
                                    />
                                </Form.Item>
                            ) : (
                                <>
                                    <Form.Item
                                        label="Título"
                                        required
                                        help="Texto principal (máx 120 caracteres). Soporta **negritas**, *cursivas* y ~~tachado~~."
                                    >
                                        <Input
                                            maxLength={120}
                                            showCount
                                            value={safeValue?.title || ''}
                                            onChange={(e) => setField({ title: e.target.value })}
                                            placeholder="Ej. Datos preliminares"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Descripción" help="Opcional, máx 500 caracteres. Soporta **negritas**, *cursivas*, ~~tachado~~ y [enlaces](url).">
                                        <MarkdownTextArea
                                            rows={3}
                                            maxLength={500}
                                            showCount
                                            value={safeValue?.description || ''}
                                            onChange={(v) => setField({ description: v })}
                                            placeholder="Detalle del aviso"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Icono">
                                        <NoticeIconField
                                            value={safeValue?.icon || ''}
                                            onChange={(v) => setField({ icon: v || null })}
                                        />
                                    </Form.Item>
                                </>
                            )}
                        </Card>

                        <Card size="small" title="Presentación" style={{ marginBottom: 16 }}>
                            <Form.Item
                                label="Variante"
                                help={safeValue?.variant === 'banner'
                                    ? 'Franja horizontal sobre el mapa. Si el texto es largo, se desplaza automáticamente. Sin icono, sin anclaje. Siempre cerrable.'
                                    : null}
                            >
                                <Radio.Group
                                    value={safeValue?.variant || 'info'}
                                    onChange={(e) => setField({ variant: e.target.value })}
                                    options={NOTICE_VARIANTS}
                                />
                            </Form.Item>
                            {safeValue?.variant !== 'banner' && anchorMode === 'coord' && (
                                <Form.Item
                                    label="Tamaño"
                                    help="Sólo aplica cuando el aviso está anclado a un punto del mapa. En posición fija usa siempre el tamaño destacado."
                                >
                                    <Select
                                        value={safeValue?.size || 'large'}
                                        onChange={(v) => setField({ size: v })}
                                        options={NOTICE_SIZES}
                                    />
                                </Form.Item>
                            )}
                            {safeValue?.variant !== 'banner' && (
                                <Form.Item
                                    label="Anclaje"
                                    help="El anclaje a un punto del mapa sólo aplica en desktop. En mobile el aviso aparece arriba centrado independientemente."
                                >
                                    <Radio.Group
                                        value={anchorMode}
                                        onChange={(e) => setField({
                                            anchorMode: e.target.value,
                                            ...(e.target.value === 'viewport' ? { anchorCoord: null } : {}),
                                        })}
                                        optionType="button"
                                        buttonStyle="solid"
                                        size="small"
                                    >
                                        <Radio.Button value="viewport">Posición fija en pantalla</Radio.Button>
                                        <Radio.Button value="coord">Anclado a un punto del mapa</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                            )}
                            {safeValue?.variant !== 'banner' && anchorMode === 'viewport' && (
                                <Form.Item label="Posición en pantalla">
                                    <Select
                                        value={safeValue?.position || 'top-center'}
                                        onChange={(v) => setField({ position: v })}
                                        options={NOTICE_POSITIONS}
                                    />
                                </Form.Item>
                            )}
                            {safeValue?.variant !== 'banner' && anchorMode === 'coord' && (
                                <>
                                    <Form.Item
                                        label="Posición de la flecha"
                                        help="Determina de qué lado del punto aparece el aviso."
                                    >
                                        <Select
                                            value={safeValue?.arrowPosition || 'bottom'}
                                            onChange={(v) => setField({ arrowPosition: v })}
                                            options={NOTICE_ARROW_POSITIONS}
                                        />
                                    </Form.Item>
                                    <Form.Item label="Punto del aviso">
                                        <NoticeAnchorField
                                            value={safeValue?.anchorCoord}
                                            onChange={(coord) => setField({ anchorCoord: coord })}
                                            geoserverUrl={GEOSERVER_BASE}
                                            geoserverWorkspace={geoserverWorkspace}
                                            geoserverLayer={geoserverLayer}
                                            styles={styles}
                                            cqlFilter={cqlFilter}
                                            zoomRange={safeValue?.zoomRange}
                                            defaultZoom={defaultZoom}
                                        />
                                    </Form.Item>
                                </>
                            )}

                            <Divider style={{ margin: '12px 0' }} orientation="left" orientationMargin={0} plain>
                                <Text strong>Visibilidad por zoom (opcional)</Text>
                            </Divider>
                            <div style={{ marginBottom: 16 }}>
                                <ZoomRangeField
                                    value={safeValue?.zoomRange}
                                    onChange={(zr) => setField({ zoomRange: zr })}
                                    defaultZoom={defaultZoom}
                                />
                            </div>

                            <Form.Item label="¿Permitir que el usuario lo cierre?">
                                <Switch
                                    checked={safeValue?.dismissible !== false}
                                    onChange={(checked) => setField({ dismissible: checked })}
                                />
                            </Form.Item>
                            {safeValue?.dismissible !== false && (
                                <Form.Item
                                    label="Permanencia del cierre"
                                    help={DISMISS_PERSISTENCE_HELP[safeValue?.dismissPersistence || 'reopen']}
                                >
                                    <Radio.Group
                                        value={safeValue?.dismissPersistence || 'reopen'}
                                        onChange={(e) => setField({ dismissPersistence: e.target.value })}
                                        optionType="button"
                                        buttonStyle="solid"
                                    >
                                        <Radio.Button value="reopen">Volver a mostrar al abrir la capa</Radio.Button>
                                        <Radio.Button value="permanent">Recordar siempre</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                            )}
                        </Card>

                        <Card size="small" title="Vigencia" style={{ marginBottom: 16 }}>
                            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                                Deja ambos campos vacíos para que el aviso sea permanente.
                            </Paragraph>
                            <Space size={12} wrap>
                                <Form.Item label="Desde" style={{ marginBottom: 0 }}>
                                    <DatePicker
                                        value={validFromValue}
                                        onChange={(d) => setField({ validFrom: d ? d.format('YYYY-MM-DD') : null })}
                                    />
                                </Form.Item>
                                <Form.Item label="Hasta" style={{ marginBottom: 0 }}>
                                    <DatePicker
                                        value={validUntilValue}
                                        onChange={(d) => setField({ validUntil: d ? d.format('YYYY-MM-DD') : null })}
                                    />
                                </Form.Item>
                            </Space>
                        </Card>

                        <Card size="small" title="Enlace opcional (CTA)">
                            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                                Si ambos campos están vacíos, no se muestra ningún enlace.
                            </Paragraph>
                            <Form.Item label="Texto del enlace">
                                <Input
                                    maxLength={80}
                                    value={safeValue?.cta?.label || ''}
                                    onChange={(e) => setCta({ label: e.target.value })}
                                    placeholder="Ej. Ver fuente"
                                />
                            </Form.Item>
                            <Form.Item
                                label="URL"
                                validateStatus={isValidHttpUrl(safeValue?.cta?.url) ? '' : 'error'}
                                help={isValidHttpUrl(safeValue?.cta?.url) ? 'Debe empezar con http:// o https://' : 'URL inválida — debe empezar con http:// o https://'}
                            >
                                <Input
                                    maxLength={500}
                                    value={safeValue?.cta?.url || ''}
                                    onChange={(e) => setCta({ url: e.target.value })}
                                    placeholder="https://"
                                    type="url"
                                />
                            </Form.Item>
                        </Card>
                    </Col>
                    <Col xs={24} md={10}>
                        <div style={{ position: previewSticky ? 'sticky' : 'static', top: previewStickyTop }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                Vista previa
                            </Text>
                            <NoticePreview value={safeValue} />
                            <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
                                La apariencia final usa los iconos y colores de MapaLab. El preview es referencial.
                            </Paragraph>
                        </div>
                    </Col>
                </Row>
            ) : null}
        </div>
    );
}
