import { useEffect, useState } from 'react';
import {
    Button,
    Drawer,
    Image,
    InputNumber,
    Input,
    Select,
    Space,
    Spin,
    Tag,
    Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { updateReporte, useReporte } from '@features/colibri/hooks/useReportes';
import { useReporteTipos } from '@features/colibri/hooks/useReporteTipos';
import { useDirecciones } from '@features/colibri/hooks/useDirecciones';
import { getReporteActividad } from '@features/colibri/api/reportesService';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import {
    ESTADO_COLORS,
    ESTADO_LABELS,
    formatDate,
} from '@features/colibri/constants';
import SourceContextView from '@features/colibri/components/SourceContextView';
import ReporteHistorialPanel from '@features/colibri/components/ReporteHistorialPanel';
import ReporteRespuestasPanel from '@features/colibri/components/ReporteRespuestasPanel';

const SEVERIDAD_OPTIONS = [
    { value: 'baja', label: 'Baja', color: 'default' },
    { value: 'media', label: 'Media', color: 'blue' },
    { value: 'alta', label: 'Alta', color: 'orange' },
    { value: 'critica', label: 'Crítica', color: 'red' },
];

const PRIORIDAD_OPTIONS = [
    { value: 'P0', label: 'P0 — bloqueante', color: 'red' },
    { value: 'P1', label: 'P1 — alta', color: 'orange' },
    { value: 'P2', label: 'P2 — media', color: 'blue' },
    { value: 'P3', label: 'P3 — baja', color: 'default' },
];

const { Text, Paragraph } = Typography;


export default function ReporteDrawer({ id, onClose, onChanged }) {
    const { reporte, loading, reload, setReporte } = useReporte(id);
    const [saving, setSaving] = useState(false);
    const { isMobile } = useIsMobile();
    const { labels: TIPO_LABELS, colors: TIPO_COLORS, bySlug: TIPOS_BY_SLUG } = useReporteTipos();
    const { direcciones } = useDirecciones({ activo: true });
    const [actividad, setActividad] = useState([]);
    const [actividadLoading, setActividadLoading] = useState(false);

    useEffect(() => {
        if (!id) {
            setActividad([]);
            return;
        }
        let cancelled = false;
        setActividadLoading(true);
        getReporteActividad(id)
            .then((data) => { if (!cancelled) setActividad(Array.isArray(data) ? data : []); })
            .catch(() => { if (!cancelled) setActividad([]); })
            .finally(() => { if (!cancelled) setActividadLoading(false); });
        return () => { cancelled = true; };
    }, [id, reporte?.actualizadoEn]);

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
            size={isMobile ? '100%' : 560}
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
                <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                    <Space size={6} wrap>
                        <Tag color={TIPO_COLORS[reporte.tipo] || 'default'}>{TIPO_LABELS[reporte.tipo] || reporte.tipo}</Tag>
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
                        <div style={{ marginTop: 8 }}>
                            <SourceContextView context={reporte.sourceContext} />
                        </div>
                    </div>

                    <ReporteRespuestasPanel
                        respuestas={reporte.respuestas}
                        tipoSchema={TIPOS_BY_SLUG[reporte.tipo]?.formSchema}
                    />

                    <div>
                        <Text strong>Dirección asignada</Text>
                        <Select
                            allowClear
                            showSearch
                            style={{ width: '100%', marginTop: 4 }}
                            value={reporte.direccionId ?? undefined}
                            disabled={saving}
                            placeholder="Sin asignar"
                            optionFilterProp="label"
                            options={direcciones.map((d) => ({
                                value: d.id,
                                label: d.siglas ? `${d.nombre} (${d.siglas})` : d.nombre,
                            }))}
                            onChange={(value) => handleUpdate({ direccion_id: value ?? null })}
                        />
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

                    <Space size={8} style={{ width: '100%' }}>
                        <div style={{ flex: 1 }}>
                            <Text strong style={{ fontSize: 12 }}>Severidad</Text>
                            <Select
                                allowClear
                                style={{ width: '100%', marginTop: 4 }}
                                value={reporte.severidad ?? undefined}
                                disabled={saving}
                                placeholder="Sin severidad"
                                options={SEVERIDAD_OPTIONS.map((o) => ({
                                    value: o.value,
                                    label: <Tag color={o.color}>{o.label}</Tag>,
                                }))}
                                onChange={(value) => handleUpdate({ severidad: value ?? null })}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Text strong style={{ fontSize: 12 }}>Prioridad</Text>
                            <Select
                                allowClear
                                style={{ width: '100%', marginTop: 4 }}
                                value={reporte.prioridad ?? undefined}
                                disabled={saving}
                                placeholder="Sin prioridad"
                                options={PRIORIDAD_OPTIONS.map((o) => ({
                                    value: o.value,
                                    label: <Tag color={o.color}>{o.label}</Tag>,
                                }))}
                                onChange={(value) => handleUpdate({ prioridad: value ?? null })}
                            />
                        </div>
                    </Space>

                    <div>
                        <Text strong style={{ fontSize: 12 }}>Duplicado de (id de reporte)</Text>
                        <InputNumber
                            min={1}
                            style={{ width: '100%', marginTop: 4 }}
                            value={reporte.duplicadoDe ?? undefined}
                            disabled={saving}
                            placeholder="ID del reporte original"
                            onBlur={(e) => {
                                const raw = e.target.value;
                                const next = raw ? parseInt(raw, 10) : null;
                                if ((reporte.duplicadoDe ?? null) !== next) {
                                    handleUpdate({ duplicado_de: next });
                                }
                            }}
                        />
                    </div>

                    <div>
                        <Text strong style={{ fontSize: 12 }}>Bloqueado por (texto libre)</Text>
                        <Input
                            style={{ marginTop: 4 }}
                            value={reporte.bloqueadoPor || ''}
                            disabled={saving}
                            onChange={(e) => setReporte({ ...reporte, bloqueadoPor: e.target.value })}
                            onBlur={(e) => {
                                if ((reporte.bloqueadoPor || '') !== (e.target.value || '')) {
                                    handleUpdate({ bloqueado_por: e.target.value || null });
                                }
                            }}
                            placeholder="Esperando respuesta del equipo X..."
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

                    <ReporteHistorialPanel actividad={actividad} loading={actividadLoading} />

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Recibido: {formatDate(reporte.creadoEn)} · Actualizado: {formatDate(reporte.actualizadoEn)}
                        {reporte.grupoId && <> · Grupo #{reporte.grupoId}</>}
                    </Text>
                </Space>
            )}
        </Drawer>
    );
}
