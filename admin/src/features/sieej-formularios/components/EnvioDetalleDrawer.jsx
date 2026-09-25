import { useEffect, useState } from 'react';
import { Alert, Descriptions, Drawer, Empty, List, Segmented, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';
import { buildRespuestas, diffDefiniciones } from './snapshotUtils';
import { SeccionContenido } from './RespuestasView';

const ESTADO_COLOR = { en_proceso: 'orange', enviado: 'green', expirado: 'red' };
const ESTADO_LABEL = { en_proceso: 'En proceso', enviado: 'Enviado', expirado: 'Expirado' };
const fmt = (v) => (v ? new Date(v).toLocaleString() : '—');

function Respuestas({ definicion, datos }) {
    const secciones = buildRespuestas(definicion, datos);
    if (!secciones.length) return <Empty description="Sin respuestas" />;
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {secciones.map((sec) => (
                <div key={sec.id}>
                    <Typography.Title level={5} style={{ marginBottom: 8 }}>{sec.title}</Typography.Title>
                    <SeccionContenido sec={sec} />
                </div>
            ))}
        </Space>
    );
}

function CambiosVersion({ snapshot, actual, versionEnvio, versionActual }) {
    const { agregados, eliminados, modificados } = diffDefiniciones(snapshot, actual);
    const total = agregados.length + eliminados.length + modificados.length;
    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
                type="info"
                showIcon
                message={`Este envío se llenó con la v${versionEnvio}. El formulario va en la v${versionActual}.`}
                description={total === 0
                    ? 'No hay diferencias de campos entre ambas versiones.'
                    : 'Estos son los cambios de la definición desde que esta persona respondió.'}
            />
            {eliminados.length > 0 && (
                <List
                    size="small"
                    header={<Typography.Text strong>Campos eliminados ({eliminados.length})</Typography.Text>}
                    dataSource={eliminados}
                    renderItem={(f) => (
                        <List.Item>
                            <Space><Tag color="red">Eliminado</Tag>{f.stepTitle} · {f.label}</Space>
                        </List.Item>
                    )}
                />
            )}
            {agregados.length > 0 && (
                <List
                    size="small"
                    header={<Typography.Text strong>Campos nuevos ({agregados.length})</Typography.Text>}
                    dataSource={agregados}
                    renderItem={(f) => (
                        <List.Item>
                            <Space><Tag color="green">Nuevo</Tag>{f.stepTitle} · {f.label}</Space>
                        </List.Item>
                    )}
                />
            )}
            {modificados.length > 0 && (
                <List
                    size="small"
                    header={<Typography.Text strong>Campos modificados ({modificados.length})</Typography.Text>}
                    dataSource={modificados}
                    renderItem={(f) => (
                        <List.Item>
                            <Space direction="vertical" size={0}>
                                <Space><Tag color="orange">Modificado</Tag>{f.stepTitle} · {f.label}</Space>
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{f.cambios.join(' · ')}</Typography.Text>
                            </Space>
                        </List.Item>
                    )}
                />
            )}
        </Space>
    );
}

export default function EnvioDetalleDrawer({ formulario, envio, open, onClose }) {
    const [detalle, setDetalle] = useState(null);
    const [loading, setLoading] = useState(false);
    const [vista, setVista] = useState('respuestas');

    useEffect(() => {
        if (!open || !envio) return undefined;
        let vivo = true;
        setLoading(true);
        setVista('respuestas');
        formulariosApi.getEnvio(formulario.id, envio.id)
            .then((data) => { if (vivo) setDetalle(data); })
            .catch(() => { if (vivo) message.error('Error al cargar el envío'); })
            .finally(() => { if (vivo) setLoading(false); });
        return () => { vivo = false; };
    }, [open, envio, formulario.id]);

    const desactualizado = detalle && detalle.formulario_version < formulario.version;

    const opciones = [
        { value: 'respuestas', label: 'Respuestas' },
        ...(desactualizado ? [{ value: 'cambios', label: 'Cambios de versión' }] : []),
        { value: 'json', label: 'JSON' },
    ];

    const archivos = detalle?.archivos || [];

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={envio ? `Envío #${envio.id}${envio.usuario_nombre ? ` — ${envio.usuario_nombre}` : ''}` : ''}
            width={Math.min(760, window.innerWidth)}
        >
            {loading || !detalle ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Descriptions size="small" column={1} bordered items={[
                        { key: 'estado', label: 'Estado', children: <Tag color={ESTADO_COLOR[detalle.estado]}>{ESTADO_LABEL[detalle.estado] || detalle.estado}</Tag> },
                        {
                            key: 'version',
                            label: 'Versión',
                            children: (
                                <Space>
                                    v{detalle.formulario_version}
                                    {desactualizado && <Tag color="orange">Desactualizado (actual v{formulario.version})</Tag>}
                                </Space>
                            ),
                        },
                        { key: 'usuario', label: 'Usuario', children: detalle.usuario_nombre ? `${detalle.usuario_nombre} (${detalle.usuario_email || '—'})` : `#${detalle.usuario_id ?? '—'}` },
                        { key: 'enviado', label: 'Enviado', children: fmt(detalle.enviado_en) },
                        { key: 'actualizado', label: 'Actualizado', children: fmt(detalle.actualizado_en) },
                    ]} />

                    <Segmented value={vista} onChange={setVista} options={opciones} block />

                    {vista === 'respuestas' && (
                        <Respuestas definicion={detalle.definicion_snapshot} datos={detalle.datos} />
                    )}
                    {vista === 'cambios' && desactualizado && (
                        <CambiosVersion
                            snapshot={detalle.definicion_snapshot}
                            actual={formulario.definicion}
                            versionEnvio={detalle.formulario_version}
                            versionActual={formulario.version}
                        />
                    )}
                    {vista === 'json' && (
                        <pre style={{ background: '#f5f5f5', padding: 12, fontSize: 12, overflowX: 'auto' }}>
                            {JSON.stringify(detalle.datos, null, 2)}
                        </pre>
                    )}

                    {archivos.length > 0 && (
                        <div>
                            <Typography.Title level={5}>Archivos</Typography.Title>
                            <Table
                                size="small"
                                pagination={false}
                                rowKey="id"
                                dataSource={archivos}
                                columns={[
                                    { title: 'Campo', dataIndex: 'field_path', key: 'field_path' },
                                    {
                                        title: 'Archivo',
                                        key: 'archivo',
                                        render: (_, a) => a.url_publica
                                            ? <a href={a.url_publica} download={a.filename_original || true} rel="noreferrer">{a.filename_original}</a>
                                            : a.filename_original,
                                    },
                                ]}
                            />
                        </div>
                    )}
                </Space>
            )}
        </Drawer>
    );
}
