import {
    Col,
    ColorPicker,
    DatePicker,
    Form,
    Input,
    Row,
    Segmented,
    Space,
    Switch,
    Typography,
} from 'antd';
import { BADGE_PRESETS, VARIANT_OPTIONS, softBg } from '@features/mapalab-layers/constants/badgePresets';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import dayjs from 'dayjs';
import '@features/mapalab-layers/components/layersEditor/appearancePanel.css';

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
            <div className="ap-cabeza" style={{ marginBottom: enabled ? 16 : 0 }}>
                <Switch
                    checked={enabled}
                    onChange={(checked) => setField({ enabled: checked, variant: safeValue?.variant || 'new' })}
                />
                <span className="ap-titulo">Distintivo</span>
                <InfoIcon title="Muestra una etiqueta junto al nombre de la capa en el menú, la búsqueda y las capas activas del visor. Solo aparece dentro de su ventana de vigencia." />
            </div>

            {enabled && (
                <Row gutter={24}>
                    <Col xs={24} md={15} style={{ minWidth: 0 }}>
                        <Form.Item label="Tipo" style={{ marginBottom: 16 }}>
                            <Segmented
                                value={variant}
                                onChange={(v) => setField({ variant: v })}
                                options={VARIANT_OPTIONS}
                            />
                        </Form.Item>

                        {isCustom && (
                            <Space size="large" align="start" style={{ marginBottom: 16 }}>
                                <Form.Item label="Texto" style={{ marginBottom: 0 }}>
                                    <Input
                                        value={safeValue?.label || ''}
                                        onChange={(e) => setField({ label: e.target.value })}
                                        placeholder="Ej. Beta"
                                        maxLength={40}
                                        style={{ width: 200 }}
                                    />
                                </Form.Item>
                                <Form.Item label="Color" style={{ marginBottom: 0 }}>
                                    <ColorPicker
                                        value={safeValue?.color || '#5C2472'}
                                        onChange={(c) => setField({ color: c.toHexString().toUpperCase() })}
                                    />
                                </Form.Item>
                            </Space>
                        )}

                        <Space size="large" align="start">
                            <Form.Item
                                label={(
                                    <Space size={6}>
                                        Vigente desde
                                        <InfoIcon title="Sin fechas el distintivo es permanente. El puntito del tema se apaga cuando el usuario activa la capa; la píldora sigue mientras esté vigente." />
                                    </Space>
                                )}
                                style={{ marginBottom: 0 }}
                            >
                                <DatePicker
                                    value={validFromValue}
                                    onChange={(d) => setField({ validFrom: d ? d.format('YYYY-MM-DD') : null })}
                                />
                            </Form.Item>
                            <Form.Item label="Vigente hasta" style={{ marginBottom: 0 }}>
                                <DatePicker
                                    value={validUntilValue}
                                    onChange={(d) => setField({ validUntil: d ? d.format('YYYY-MM-DD') : null })}
                                />
                            </Form.Item>
                        </Space>
                    </Col>

                    <Col xs={24} md={9} style={{ minWidth: 0 }}>
                        <div style={{ position: 'sticky', top: 0 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Vista previa</Text>
                            {preview ? (
                                <span
                                    style={{
                                        display: 'inline-block',
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
                            ) : (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Elige un tipo, o escribe texto y color si es personalizado.
                                </Text>
                            )}
                        </div>
                    </Col>
                </Row>
            )}
        </div>
    );
}
