import { useCallback, useEffect, useState } from 'react';
import {
    Button, Space, Table, Tag, Typography, Tooltip,
} from 'antd';
import {
    DownloadOutlined, ReloadOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';

const { Text } = Typography;

const ESTADO_PERIODO = {
    programado: { color: 'blue', label: 'Programado' },
    abierto: { color: 'green', label: 'Abierto' },
    cerrado: { color: 'default', label: 'Cerrado' },
};

const TIPO_AVISO = {
    apertura: { color: 'green', label: 'Apertura' },
    faltantes: { color: 'red', label: 'Faltantes' },
};

const fmt = (iso) => (iso
    ? new Date(iso).toLocaleString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    : '—');

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

export default function PeriodosPanel({ formulario }) {
    const [periodos, setPeriodos] = useState([]);
    const [avisos, setAvisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ticking, setTicking] = useState(false);
    const [exporting, setExporting] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [ps, ns] = await Promise.all([
                formulariosApi.periodos(formulario.id),
                formulariosApi.notificaciones(formulario.id),
            ]);
            setPeriodos(ps);
            setAvisos(ns);
        } catch {
            message.error('Error al cargar los periodos');
        } finally {
            setLoading(false);
        }
    }, [formulario.id]);

    useEffect(() => { load(); }, [load]);

    const handleTick = async () => {
        setTicking(true);
        try {
            const res = await formulariosApi.tickPeriodos();
            message.success(
                `Tick ejecutado: ${res.aperturas_notificadas} apertura(s), `
                + `${res.cierres_notificados} cierre(s), ${res.envios_expirados} envío(s) expirado(s).`,
            );
            await load();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al ejecutar el tick');
        } finally {
            setTicking(false);
        }
    };

    const handleExport = async (formato) => {
        setExporting(formato);
        try {
            const res = await formulariosApi.exportarNotificaciones(formulario.id, formato);
            triggerDownload(res, `comunicaciones.${formato}`);
        } catch {
            message.error('Error al exportar la bitácora');
        } finally {
            setExporting(null);
        }
    };

    const periodoCols = [
        { title: 'Periodo', dataIndex: 'clave', key: 'clave' },
        { title: 'Apertura', dataIndex: 'apertura', key: 'apertura', render: fmt },
        { title: 'Cierre', dataIndex: 'cierre', key: 'cierre', render: fmt },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            render: (e) => {
                const c = ESTADO_PERIODO[e] || { color: 'default', label: e };
                return <Tag color={c.color}>{c.label}</Tag>;
            },
        },
        {
            title: 'Avisos',
            key: 'avisos',
            render: (_, p) => (
                <Space size={4}>
                    {p.notificado_apertura_en && <Tag color="green">Apertura</Tag>}
                    {p.notificado_faltantes_en && <Tag color="red">Faltantes</Tag>}
                    {!p.notificado_apertura_en && !p.notificado_faltantes_en && <Text type="secondary">—</Text>}
                </Space>
            ),
        },
    ];

    const avisoCols = [
        { title: 'Fecha', dataIndex: 'enviado_en', key: 'enviado_en', render: fmt },
        {
            title: 'Tipo',
            dataIndex: 'tipo',
            key: 'tipo',
            render: (t) => {
                const c = TIPO_AVISO[t] || { color: 'default', label: t };
                return <Tag color={c.color}>{c.label}</Tag>;
            },
        },
        { title: 'Periodo', dataIndex: 'periodo_clave', key: 'periodo_clave', render: (c) => c || '—' },
        { title: 'Resumen', dataIndex: 'resumen', key: 'resumen' },
        {
            title: 'Faltantes',
            key: 'faltantes',
            render: (_, n) => (n.tipo === 'faltantes'
                ? (n.payload?.faltantes?.length ?? 0)
                : '—'),
        },
    ];

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Typography.Title level={5} style={{ margin: 0 }}>Ventanas del formulario</Typography.Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Actualizar</Button>
                    <Tooltip title="Abre/cierra ventanas vencidas, expira envíos y dispara avisos ahora (lo hace el cron automáticamente).">
                        <Button
                            icon={<ThunderboltOutlined />}
                            onClick={handleTick}
                            loading={ticking}
                        >
                            Ejecutar tick ahora
                        </Button>
                    </Tooltip>
                </Space>
            </div>
            <Table
                rowKey="id"
                size="small"
                loading={loading}
                columns={periodoCols}
                dataSource={periodos}
                pagination={false}
                locale={{ emptyText: 'Aún no hay ventanas generadas. Publica el formulario o ejecuta el tick.' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Typography.Title level={5} style={{ margin: 0 }}>Bitácora de comunicaciones</Typography.Title>
                <Space>
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={() => handleExport('csv')}
                        loading={exporting === 'csv'}
                    >
                        CSV
                    </Button>
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={() => handleExport('xlsx')}
                        loading={exporting === 'xlsx'}
                    >
                        Excel
                    </Button>
                </Space>
            </div>
            <Table
                rowKey="id"
                size="small"
                loading={loading}
                columns={avisoCols}
                dataSource={avisos}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                locale={{ emptyText: 'Sin avisos registrados todavía.' }}
            />
        </Space>
    );
}
