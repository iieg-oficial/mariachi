import { useEffect, useState, useCallback } from 'react';
import { Button, Drawer, Empty, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';

const ESTADO_COLOR = { en_proceso: 'orange', enviado: 'green', expirado: 'red' };
const ESTADO_LABEL = { en_proceso: 'En proceso', enviado: 'Enviado', expirado: 'Expirado' };

export default function EnviosTable({ formulario }) {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [estado, setEstado] = useState(undefined);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [drawer, setDrawer] = useState(null);

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
        { title: 'Versión', dataIndex: 'formulario_version', key: 'formulario_version', width: 100 },
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
            width: 120,
            render: (_, record) => {
                if (record.estado !== 'enviado' && record.estado !== 'expirado') return null;
                return (
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
                );
            },
        },
    ];

    return (
        <>
            <Space style={{ marginBottom: 12 }}>
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
            <Drawer
                open={!!drawer}
                onClose={() => setDrawer(null)}
                title={drawer ? `Envío #${drawer.id}${drawer.usuario_nombre ? ` — ${drawer.usuario_nombre}` : ''}` : ''}
                width={Math.min(720, window.innerWidth)}
            >
                {drawer && (
                    <pre style={{ background: '#f5f5f5', padding: 12, fontSize: 12 }}>
                        {JSON.stringify(drawer.datos, null, 2)}
                    </pre>
                )}
                {drawer?.archivos?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <Typography.Title level={5}>Archivos</Typography.Title>
                        <ul>
                            {drawer.archivos.map((a) => (
                                <li key={a.id}>
                                    <Typography.Text code>{a.field_path}</Typography.Text>:{' '}
                                    {a.url_publica
                                        ? <a href={a.url_publica} target="_blank" rel="noreferrer">{a.filename_original}</a>
                                        : a.filename_original}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Drawer>
        </>
    );
}
