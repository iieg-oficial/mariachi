import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, ColorPicker, Divider, Modal, Radio, Select, Space, Tag, Typography, notification } from 'antd';
import { ReloadOutlined, UndoOutlined } from '@ant-design/icons';
import { HIGHLIGHT_COLORS, HIGHLIGHT_SHAPES, isHexHighlight, resolveColorEntry } from './layersEditor/highlightConstants';
import { HighlightSwatch } from './layersEditor/highlightShared';
import { HighlightApplyConfirm, HighlightResetConfirm } from './LayerHighlightConfirmModal';
import { useHighlightBulk } from '../hooks/useHighlightBulk';

const { Text, Paragraph } = Typography;

const colorPresetOptions = HIGHLIGHT_COLORS.filter((c) => c.value !== null && c.value !== '__custom__');
const shapeOptions = HIGHLIGHT_SHAPES.filter((s) => s.value !== null);

const formatColorLabel = (value) => {
    if (!value) return 'Default';
    return value;
};

export default function LayerHighlightGlobalSettings({ open, onClose, treeData = [] }) {
    const { stats, fetchStats, dryRun, apply, reset, undo, loading } = useHighlightBulk();
    const [color, setColor] = useState(null);
    const [shape, setShape] = useState(null);
    const [applyTo, setApplyTo] = useState('defaults');
    const [themeIds, setThemeIds] = useState([]);
    const [previewCount, setPreviewCount] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

    useEffect(() => { if (open) fetchStats(); }, [open, fetchStats]);

    const themeOptions = useMemo(() => (
        (treeData || [])
            .filter((n) => n.nodeType === 'tema' || n.raw?.nodeType === 'tema')
            .map((n) => ({ value: n.key || n.id, label: n.title || n.label }))
    ), [treeData]);

    useEffect(() => {
        let cancel = false;
        const fetch = async () => {
            if (!open) return;
            if (color === null && shape === null && applyTo === 'defaults') {
                setPreviewCount(null);
                return;
            }
            try {
                const res = await dryRun({ color, shape, applyTo, themeIds: themeIds.length ? themeIds : null });
                if (!cancel) setPreviewCount(res.affected);
            } catch {
                if (!cancel) setPreviewCount(null);
            }
        };
        fetch();
        return () => { cancel = true; };
    }, [open, color, shape, applyTo, themeIds, dryRun]);

    const notifyWithUndo = (message, snapshot) => {
        notification.success({
            message,
            description: (snapshot || []).length > 0 ? 'Tienes 5 minutos para deshacer.' : null,
            btn: (snapshot || []).length > 0 ? (
                <Button size="small" icon={<UndoOutlined />} onClick={() => undo().then(() => {
                    notification.info({ message: 'Cambio deshecho' });
                    fetchStats();
                })}>Deshacer</Button>
            ) : null,
            duration: 6,
        });
    };

    const handleApply = async () => {
        try {
            const res = await apply({ color, shape, applyTo, themeIds: themeIds.length ? themeIds : null });
            notifyWithUndo(`Resaltado actualizado en ${res.affected} capa${res.affected === 1 ? '' : 's'}`, res.snapshot);
            fetchStats();
            setConfirmOpen(false);
        } catch (e) {
            notification.error({ message: 'Error al aplicar', description: e.response?.data?.detail || e.message });
        }
    };

    const handleReset = async () => {
        try {
            const res = await reset({ themeIds: themeIds.length ? themeIds : null });
            notifyWithUndo(`Restablecidas ${res.affected} capa${res.affected === 1 ? '' : 's'} a default`, res.snapshot);
            fetchStats();
            setResetConfirmOpen(false);
        } catch (e) {
            notification.error({ message: 'Error al restablecer', description: e.response?.data?.detail || e.message });
        }
    };

    const colorEntryPreview = resolveColorEntry(color);
    const shapePreview = shape || 'area';
    const noChangePending = color === null && shape === null && applyTo === 'defaults';

    return (
        <>
            <Modal open={open} onCancel={onClose} title="Configuración global del resaltado" width={760} footer={[<Button key="close" onClick={onClose}>Cerrar</Button>]}>
                <Alert
                    type="info" showIcon style={{ marginBottom: 16 }}
                    title="Afecta solo a capas tipo hoja (leaf)"
                    description="Categorías, grupos y temas no se tocan. Las leaves pueden heredar el resaltado de un ancestro; si tienen su propio override, lo conservan salvo que elijas 'sobrescribir todas'."
                />

                <Card size="small" title="Estado actual" extra={<Button size="small" icon={<ReloadOutlined />} onClick={fetchStats} loading={loading}>Recargar</Button>}>
                    {stats ? (
                        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                            <div><Text strong>{stats.totalLeaves}</Text> <Text type="secondary">hojas en total.</Text></div>
                            <div>
                                <Tag color="default">{stats.fullyDefault} fully default</Tag>
                                <Tag color="purple">{stats.withColorOverride} con color override</Tag>
                                <Tag color="cyan">{stats.withShapeOverride} con forma override</Tag>
                                <Tag color="magenta">{stats.withCustomHex} con hex personalizado</Tag>
                            </div>
                            <Divider style={{ margin: '8px 0' }} />
                            <Text type="secondary">Por color:</Text>
                            <div>{Object.entries(stats.byColor || {}).map(([k, v]) => <Tag key={`c-${k}`}>{formatColorLabel(k === 'default' ? null : k)}: {v}</Tag>)}</div>
                            <Text type="secondary">Por forma:</Text>
                            <div>{Object.entries(stats.byShape || {}).map(([k, v]) => <Tag key={`s-${k}`}>{k === 'default' ? 'área (default)' : k}: {v}</Tag>)}</div>
                        </Space>
                    ) : <Text type="secondary">Cargando...</Text>}
                </Card>

                <Card size="small" title="Aplicar masivo" style={{ marginTop: 12 }}>
                    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                        <div>
                            <Text strong>Color</Text>
                            <Radio.Group
                                value={isHexHighlight(color) ? '__custom__' : (color || '__default__')}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '__default__') setColor(null);
                                    else if (v === '__custom__') setColor(isHexHighlight(color) ? color : '#5C2472');
                                    else setColor(v);
                                }}
                                style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}
                            >
                                <Radio value="__default__"><HighlightSwatch stroke="#999" fill="#eee" shape={shapePreview} /><Text>No cambiar color (mantener actual)</Text></Radio>
                                {colorPresetOptions.map((c) => (
                                    <Radio key={c.value} value={c.value}><HighlightSwatch stroke={c.stroke} fill={c.fill} shape={shapePreview} /><Text>{c.label}</Text></Radio>
                                ))}
                                <Radio value="__custom__">
                                    <HighlightSwatch stroke={isHexHighlight(color) ? color : '#5C2472'} fill={isHexHighlight(color) ? `${color}2D` : 'rgba(92,36,114,0.18)'} shape={shapePreview} />
                                    <Text>Color hex personalizado</Text>
                                    {isHexHighlight(color) && <ColorPicker value={color} onChange={(c) => setColor(c.toHexString().toUpperCase())} size="small" style={{ marginLeft: 8 }} />}
                                </Radio>
                            </Radio.Group>
                        </div>

                        <div>
                            <Text strong>Forma</Text>
                            <Radio.Group value={shape || '__default__'} onChange={(e) => setShape(e.target.value === '__default__' ? null : e.target.value)} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                                <Radio value="__default__">No cambiar forma (mantener actual)</Radio>
                                {shapeOptions.map((s) => (
                                    <Radio key={s.value} value={s.value}><HighlightSwatch stroke={colorEntryPreview.stroke} fill={colorEntryPreview.fill} shape={s.preview} /><Text>{s.label}</Text></Radio>
                                ))}
                            </Radio.Group>
                        </div>

                        <div>
                            <Text strong>Aplicar a</Text>
                            <Radio.Group value={applyTo} onChange={(e) => setApplyTo(e.target.value)} optionType="button" buttonStyle="solid" style={{ marginTop: 6, display: 'block' }}>
                                <Radio.Button value="defaults">Solo capas con default (no tocar overrides)</Radio.Button>
                                <Radio.Button value="all">Sobrescribir todas</Radio.Button>
                            </Radio.Group>
                        </div>

                        <div>
                            <Text strong>Filtrar por tema (opcional)</Text>
                            <Select mode="multiple" style={{ display: 'block', marginTop: 6 }} placeholder="Todos los temas. Selecciona uno o varios para acotar." value={themeIds} onChange={setThemeIds} options={themeOptions} allowClear />
                        </div>

                        {previewCount !== null && (
                            <Alert type={previewCount > 0 ? 'warning' : 'info'} showIcon title={previewCount > 0 ? `Vas a actualizar ${previewCount} capa${previewCount === 1 ? '' : 's'}.` : 'Ninguna capa coincide con los criterios actuales.'} />
                        )}

                        <Space>
                            <Button type="primary" disabled={loading || previewCount === null || previewCount === 0 || noChangePending} onClick={() => setConfirmOpen(true)}>
                                Aplicar a {previewCount ?? 0} capa{previewCount === 1 ? '' : 's'}
                            </Button>
                            <Button danger onClick={() => setResetConfirmOpen(true)}>Restablecer todas a default</Button>
                        </Space>

                        <Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 0 }}>
                            Después de aplicar, la notificación trae un botón "Deshacer" disponible por 5 minutos para revertir el cambio masivo.
                        </Paragraph>
                    </Space>
                </Card>
            </Modal>

            <HighlightApplyConfirm open={confirmOpen} onCancel={() => setConfirmOpen(false)} onOk={handleApply} loading={loading} previewCount={previewCount} color={color} shape={shape} applyTo={applyTo} themeIds={themeIds} />
            <HighlightResetConfirm open={resetConfirmOpen} onCancel={() => setResetConfirmOpen(false)} onOk={handleReset} loading={loading} themeIds={themeIds} />
        </>
    );
}
