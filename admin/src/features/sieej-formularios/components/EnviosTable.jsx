import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Empty, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, UndoOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';
import EnvioDetalleDrawer from './EnvioDetalleDrawer';

const ESTADO_COLOR = { en_proceso: 'orange', enviado: 'green', expirado: 'red' };
const ESTADO_LABEL = { en_proceso: 'En proceso', enviado: 'Enviado', expirado: 'Expirado' };

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
    const [desactualizados, setDesactualizados] = useState(0);
    const [loading, setLoading] = useState(true);
    const [estado, setEstado] = useState(undefined);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [drawer, setDrawer] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [pdfLoadingId, setPdfLoadingId] = useState(null);

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
            setDesactualizados(data.desactualizados ?? 0);
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

    const handleExcel = async () => {
        setExporting(true);
        try {
            const res = await formulariosApi.exportarEnvios(formulario.id);
            triggerDownload(res, `${formulario.slug || 'formulario'}_envios.xlsx`);
        } catch {
            message.error('Error al exportar el Excel');
        } finally {
            setExporting(false);
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
            render: (v) => <Tag color={ESTADO_COLOR[v]}>{ESTADO_LABEL[v] || v}</Tag>,
        },
        {
            title: 'Iniciado',
            dataIndex: 'iniciado_en',
            key: 'iniciado_en',
            render: (v) => v ? new Date(v).toLocaleString() : '—',
        },
        {
            title: 'Enviado',
            dataIndex: 'enviado_en',
            key: 'enviado_en',
            render: (v) => v ? new Date(v).toLocaleString() : '—',
        },
        {
            title: 'Actualizado',
            dataIndex: 'actualizado_en',
            key: 'actualizado_en',
            render: (v) => v ? new Date(v).toLocaleString() : '—',
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
                            >
                                Reabrir
                            </Button>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            {desactualizados > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    closable
                    style={{ marginBottom: 12 }}
                    message={`${desactualizados} ${desactualizados === 1 ? 'envío se llenó' : 'envíos se llenaron'} con una versión anterior del formulario (actual: v${formulario.version}).`}
                    description="Abre un envío marcado como «Desactualizado» para ver los cambios de la definición desde que se respondió."
                />
            )}
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
                <Button
                    icon={<FileExcelOutlined />}
                    loading={exporting}
                    disabled={total === 0}
                    onClick={handleExcel}
                >
                    Descargar Excel
                </Button>
            </div>
            <Table
                columns={columns}
                dataSource={items}
                rowKey="id"
                loading={loading}
                onRow={(record) => ({ onClick: () => setDrawer(record) })}
                pagination={{
                    current: page,
                    pageSize,
                    total,
                    onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                }}
                locale={{ emptyText: <Empty description="Sin envios" /> }}
                scroll={{ x: 'max-content' }}
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
