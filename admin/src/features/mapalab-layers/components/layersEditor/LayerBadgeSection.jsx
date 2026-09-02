import {
    ColorPicker,
    DatePicker,
    Divider,
    Form,
    Input,
    Radio,
    Space,
    Switch,
    Typography,
} from 'antd';
import { BADGE_PRESETS, VARIANT_OPTIONS, softBg } from '@features/mapalab-layers/constants/badgePresets';
import dayjs from 'dayjs';

const { Text } = Typography;


const resolvePreview = (value) => {
    const preset = BADGE_PRESETS[value?.variant];
    const color = value?.variant === 'custom' ? value?.color : preset?.color;
    const label = value?.label || preset?.label;
    if (!color || !label) return null;
    return { label, color, bg: softBg(color) };
};

export default function LayerBadgeSection({ value, onChange }) {
    const safeValue = value || null;
    const enabled = Boolean(safeValue?.enabled);
    const variant = safeValue?.variant || 'new';
    const isCustom = variant === 'custom';

    const setField = (patch) => {
        const base = safeValue || { enabled: false, variant: 'new' };
        onChange?.({ ...base, ...patch });
    };

    const validFromValue = safeValue?.validFrom ? dayjs(safeValue.validFrom) : null;
    const validUntilValue = safeValue?.validUntil ? dayjs(safeValue.validUntil) : null;
    const preview = resolvePreview({ ...safeValue, variant });

    return (
        <div>
            <Form.Item label={<Text strong>Habilitar badge</Text>} style={{ marginBottom: 16 }}>
                <Switch
                    checked={enabled}
                    onChange={(checked) => setField({ enabled: checked, variant: safeValue?.variant || 'new' })}
                />
                <Text type="secondary" style={{ marginLeft: 12 }}>
                    {enabled
                        ? 'La capa mostrará una etiqueta en el menú, búsqueda y capas activas.'
                        : 'Apagado (no se muestra al usuario).'}
                </Text>
            </Form.Item>

            {enabled && (
                <>
                    <Form.Item label={<Text strong>Tipo</Text>} style={{ marginBottom: 16 }}>
                        <Radio.Group
                            value={variant}
                            onChange={(e) => setField({ variant: e.target.value })}
                            optionType="button"
                            buttonStyle="solid"
                        >
                            {VARIANT_OPTIONS.map((opt) => (
                                <Radio.Button key={opt.value} value={opt.value}>
                                    {opt.label}
                                </Radio.Button>
                            ))}
                        </Radio.Group>
                    </Form.Item>

                    {isCustom && (
                        <Space size="large" align="start" style={{ marginBottom: 16 }}>
                            <Form.Item label={<Text strong>Texto</Text>} style={{ marginBottom: 0 }}>
                                <Input
                                    value={safeValue?.label || ''}
                                    onChange={(e) => setField({ label: e.target.value })}
                                    placeholder="Ej. Beta"
                                    maxLength={40}
                                    style={{ width: 200 }}
                                />
                            </Form.Item>
                            <Form.Item label={<Text strong>Color</Text>} style={{ marginBottom: 0 }}>
                                <ColorPicker
                                    value={safeValue?.color || '#5C2472'}
                                    onChange={(c) => setField({ color: c.toHexString().toUpperCase() })}
                                />
                            </Form.Item>
                        </Space>
                    )}

                    <Space size="large" align="start" style={{ marginBottom: 16 }}>
                        <Form.Item label={<Text strong>Vigente desde</Text>} style={{ marginBottom: 0 }}>
                            <DatePicker
                                value={validFromValue}
                                onChange={(d) => setField({ validFrom: d ? d.format('YYYY-MM-DD') : null })}
                            />
                        </Form.Item>
                        <Form.Item label={<Text strong>Vigente hasta</Text>} style={{ marginBottom: 0 }}>
                            <DatePicker
                                value={validUntilValue}
                                onChange={(d) => setField({ validUntil: d ? d.format('YYYY-MM-DD') : null })}
                            />
                        </Form.Item>
                    </Space>

                    <Text type="secondary" style={{ display: 'block' }}>
                        Sin fechas, el badge es permanente. El puntito del tema se apaga cuando el usuario
                        activa la capa; la pildora sigue mientras esté vigente.
                    </Text>

                    {preview && (
                        <>
                            <Divider />
                            <Space align="center">
                                <Text strong>Vista previa:</Text>
                                <span
                                    style={{
                                        color: preview.color,
                                        backgroundColor: preview.bg,
                                        padding: '2px 8px',
                                        borderRadius: 9999,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em',
                                    }}
                                >
                                    {preview.label}
                                </span>
                            </Space>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
