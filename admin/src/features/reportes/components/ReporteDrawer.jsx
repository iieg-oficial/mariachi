import { useState } from 'react';
import {
    Button,
    Drawer,
    Image,
    Input,
    Select,
    Space,
    Spin,
    Tag,
    Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { updateReporte, useReporte } from '@features/reportes/hooks/useReportes';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import {
    ESTADO_COLORS,
    ESTADO_LABELS,
    TIPO_COLORS,
    TIPO_LABELS,
    formatDate,
} from '@features/reportes/constants';

const { Text, Paragraph } = Typography;


export default function ReporteDrawer({ id, onClose, onChanged }) {
    const { reporte, loading, reload, setReporte } = useReporte(id);
    const [saving, setSaving] = useState(false);
    const { isMobile } = useIsMobile();

    const handleUpdate = async (changes) => {
        if (!reporte) return;
        setSaving(true);
        try {
            const updated = await updateReporte(reporte.id, changes);
            setReporte(updated);
            onChanged?.();
            message.success('Reporte actualizado');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al actualizar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            open={Boolean(id)}
            title={reporte ? `Reporte #${reporte.id}` : 'Reporte'}
            width={isMobile ? '100%' : 560}
            onClose={onClose}
            destroyOnClose
            extra={
                <Button icon={<ReloadOutlined />} size="small" onClick={reload} loading={loading}>
                    Refrescar
                </Button>
            }
        >
            {loading || !reporte ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Space size={6} wrap>
                        <Tag color={TIPO_COLORS[reporte.tipo]}>{TIPO_LABELS[reporte.tipo]}</Tag>
                        <Tag color={ESTADO_COLORS[reporte.estado]}>{ESTADO_LABELS[reporte.estado]}</Tag>
                        <Tag>{reporte.sourceApp}</Tag>
                    </Space>

                    <div>
                        <Text strong>Mensaje</Text>
                        <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                            {reporte.mensaje}
                        </Paragraph>
                    </div>

                    {reporte.emailContacto && (
                        <div>
                            <Text strong>Contacto</Text>
                            <div><Text copyable>{reporte.emailContacto}</Text></div>
                        </div>
                    )}

                    {reporte.sourceRoute && (
                        <div>
                            <Text strong>Ruta</Text>
                            <div>
                                <Text code>{reporte.sourceRoute}</Text>
                                <Button
                                    type="link"
                                    size="small"
                                    href={reporte.sourceRoute}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Abrir
                                </Button>
                            </div>
                        </div>
                    )}

                    {reporte.screenshotUrl && (
                        <div>
                            <Text strong>Captura</Text>
                            <div style={{ marginTop: 8 }}>
                                <Image src={reporte.screenshotUrl} alt="Captura del reporte" />
                            </div>
                        </div>
                    )}

                    <div>
                        <Text strong>Contexto</Text>
                        <pre
                            style={{
                                background: '#f5f5f5',
                                padding: 12,
                                borderRadius: 6,
                                fontSize: 11,
                                maxHeight: 240,
                                overflow: 'auto',
                            }}
                        >
                            {JSON.stringify(reporte.sourceContext || {}, null, 2)}
                        </pre>
                    </div>

                    <div>
                        <Text strong>Estado</Text>
                        <Select
                            style={{ width: '100%', marginTop: 4 }}
                            value={reporte.estado}
                            disabled={saving}
                            options={Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }))}
                            onChange={(value) => handleUpdate({ estado: value })}
                        />
                    </div>

                    <div>
                        <Text strong>Nota interna</Text>
                        <Input.TextArea
                            rows={3}
                            value={reporte.notaInterna || ''}
                            disabled={saving}
                            onChange={(e) => setReporte({ ...reporte, notaInterna: e.target.value })}
                            onBlur={(e) => {
                                if ((reporte.notaInterna || '') !== (e.target.value || '')) {
                                    handleUpdate({ nota_interna: e.target.value || null });
                                }
                            }}
                            placeholder="Anotaciones para el equipo (no se muestran al usuario)."
                        />
                    </div>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Recibido: {formatDate(reporte.creadoEn)} · Actualizado: {formatDate(reporte.actualizadoEn)}
                    </Text>
                </Space>
            )}
        </Drawer>
    );
}
