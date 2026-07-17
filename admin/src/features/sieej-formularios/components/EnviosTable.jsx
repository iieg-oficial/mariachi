import { useEffect, useState, useCallback } from 'react';
import { Button, Descriptions, Empty, Modal, Select, Skeleton, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, FileTextOutlined, UndoOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';
import { buildRespuestas } from './snapshotUtils';
import { SeccionContenido } from './RespuestasView';
import EnvioDetalleDrawer from './EnvioDetalleDrawer';

const ESTADO_COLOR = { en_proceso: 'orange', enviado: 'green', expirado: 'red' };
const ESTADO_LABEL = { en_proceso: 'En proceso', enviado: 'Enviado', expirado: 'Expirado' };

const fmtFecha = (v) => (v ? new Date(v).toLocaleString() : '—');

function EnvioRespuestasExpandida({ estado, record }) {
    return (
        <>
            <Descriptions
                size="small"
                column={4}
                style={{ marginBottom: 12 }}
                items={[
                    { key: 'usuario', label: 'Usuario', children: record.usuario_nombre || `#${record.usuario_id ?? '—'}` },
                    { key: 'iniciado', label: 'Iniciado', children: fmtFecha(record.iniciado_en) },
                    { key: 'enviado', label: 'Enviado', children: fmtFecha(record.enviado_en) },
                    { key: 'actualizado', label: 'Actualizado', children: fmtFecha(record.actualizado_en) },
                ]}
            />
            {(!estado || estado.loading) && <Skeleton active paragraph={{ rows: 4 }} />}
            {estado?.error && <Typography.Text type="danger">Error al cargar el envío</Typography.Text>}
            {estado && !estado.loading && !estado.error && (() => {
                const secciones = buildRespuestas(estado.data.definicion_snapshot, estado.data.datos);
                if (!secciones.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin respuestas" />;
                return (
                    <Tabs
                        destroyOnHidden
                        items={secciones.map((sec) => ({
                            key: sec.id,
                            label: sec.title,
                            children: <SeccionContenido sec={sec} />,
                        }))}
                    />
                );
            })()}
        </>
    );
}

const filenameFromHeaders = (headers, fallback) => {
    const cd = headers?.['content-disposition'] || '';
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
    if (utf8) return decodeURIComponent(utf8[1]);
    const plain = /filename="?([^";]+)"?/i.exec(cd);
    return plain ? plain[1] : fallback;
};

const triggerDownload = (response, fallback) => {
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameFromHeaders(response.headers, fallback);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export default function EnviosTable({ formulario }) {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [estado, setEstado] = useState(undefined);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [drawer, setDrawer] = useState(null);
    const [exporting, setExporting] = useState(null);
    const [pdfLoadingId, setPdfLoadingId] = useState(null);
    const [detalles, setDetalles] = useState({});

    const cargarDetalle = useCallback(async (id) => {
        if (detalles[id]) return;
        setDetalles((prev) => ({ ...prev, [id]: { loading: true } }));
        try {
            const data = await formulariosApi.getEnvio(formulario.id, id);
            setDetalles((prev) => ({ ...prev, [id]: { loading: false, data } }));
        } catch {
            setDetalles((prev) => ({ ...prev, [id]: { loading: false, error: true } }));
        }
    }, [detalles, formulario.id]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await formulariosApi.listEnvios(formulario.id, {
                estado,
                offset: (page - 1) * pageSize,
                limit: pageSize,
            });
            setItems(data.items);
            setTotal(data.total);
        } catch {
            message.error('Error al cargar envios');
        } finally {
            setLoading(false);
        }
    }, [formulario.id, estado, page, pageSize]);

    useEffect(() => { load(); }, [load]);

    const fueraDeVigencia = formulario.vigencia_fin && new Date(formulario.vigencia_fin) < new Date();
    const reabrirBloqueado = formulario.estado === 'cerrado'
        ? 'No se puede reabrir: el formulario está cerrado'
        : fueraDeVigencia
            ? 'No se puede reabrir: el formulario está fuera de vigencia'
            : null;

    const handleExport = async (formato) => {
        setExporting(formato);
        try {
            const res = await formulariosApi.exportarEnvios(formulario.id, formato);
            triggerDownload(res, `${formulario.slug || 'formulario'}_envios.${formato}`);
        } catch {
            message.error(formato === 'csv' ? 'Error al exportar el CSV' : 'Error al exportar el Excel');
        } finally {
            setExporting(null);
        }
    };

    const handlePdf = async (record) => {
        setPdfLoadingId(record.id);
        try {
            const res = await formulariosApi.descargarEnvioPdf(formulario.id, record.id);
            triggerDownload(res, `envio_${record.id}.pdf`);
        } catch {
            message.error('Error al generar el PDF');
        } finally {
            setPdfLoadingId(null);
        }
    };

    const handleReabrir = (record) => {
        Modal.confirm({
            title: `¿Reabrir el envío #${record.id}?`,
            content: 'El envío regresará a "En proceso" y la dependencia podrá corregirlo y volver a enviarlo. Conserva la versión del formulario con la que se llenó.',
            okText: 'Reabrir',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await formulariosApi.reabrirEnvio(formulario.id, record.id);
                    message.success(`Envío #${record.id} reabierto`);
                    load();
                } catch (err) {
                    message.error(err?.response?.data?.detail || 'Error al reabrir el envío');
                }
            },
        });
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
        {
            title: 'Usuario',
            key: 'usuario',
            width: 200,
            render: (_, r) => r.usuario_nombre
                ? <Tooltip title={r.usuario_email}>{r.usuario_nombre}</Tooltip>
                : `#${r.usuario_id ?? '—'}`,
        },
        {
            title: 'Versión',
            dataIndex: 'formulario_version',
            key: 'formulario_version',
            width: 150,
            render: (v) => (
                <Space size={4}>
                    v{v}
                    {v < formulario.version && (
                        <Tooltip title={`Se llenó con una versión anterior (actual: v${formulario.version})`}>
                            <Tag color="orange">Desactualizado</Tag>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 120,
            render: (v) => <Tag color={ESTADO_COLOR[v]}>{ESTADO_LABEL[v] || v}</Tag>,
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 170,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Descargar PDF">
                        <Button
                            type="link"
                            size="small"
                            icon={<FilePdfOutlined />}
                            loading={pdfLoadingId === record.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePdf(record);
                            }}
                        />
                    </Tooltip>
                    {(record.estado === 'enviado' || record.estado === 'expirado') && (
                        <Tooltip title={reabrirBloqueado}>
                            <Button
                                type="link"
                                size="small"
                                icon={<UndoOutlined />}
                                disabled={!!reabrirBloqueado}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleReabrir(record);
                                }}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <Space>
                    <Typography.Text>Filtrar por estado:</Typography.Text>
                    <Select
                        allowClear
                        placeholder="Todos"
                        style={{ minWidth: 180 }}
                        value={estado}
                        onChange={(v) => { setEstado(v); setPage(1); }}
                        options={[
                            { value: 'en_proceso', label: 'En proceso' },
                            { value: 'enviado', label: 'Enviado' },
                            { value: 'expirado', label: 'Expirado' },
                        ]}
                    />
                </Space>
                <Space>
                    <Button
                        icon={<FileExcelOutlined />}
                        loading={exporting === 'xlsx'}
                        disabled={total === 0}
                        onClick={() => handleExport('xlsx')}
                    >
                        Descargar XLSX
                    </Button>
                    <Button
                        icon={<FileTextOutlined />}
                        loading={exporting === 'csv'}
                        disabled={total === 0}
                        onClick={() => handleExport('csv')}
                    >
                        Descargar CSV
                    </Button>
                </Space>
            </div>
            <Table
                columns={columns}
                dataSource={items}
                rowKey="id"
                loading={loading}
                onRow={(record) => ({ onClick: () => setDrawer(record) })}
                expandable={{
                    expandedRowRender: (record) => <EnvioRespuestasExpandida estado={detalles[record.id]} record={record} />,
                    onExpand: (expanded, record) => { if (expanded) cargarDetalle(record.id); },
                }}
                pagination={{
                    current: page,
                    pageSize,
                    total,
                    onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                }}
                locale={{ emptyText: <Empty description="Sin envios" /> }}
                scroll={{ x: 'min-content' }}
            />
            <EnvioDetalleDrawer
                formulario={formulario}
                envio={drawer}
                open={!!drawer}
                onClose={() => setDrawer(null)}
            />
        </>
    );
}
