import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Segmented, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { BookOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import TituloConAyuda from '@shared/components/TituloConAyuda';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import SincronizacionesPanel from '../components/SincronizacionesPanel';
import { ajustarPipeline, listarPipelines, listarSincronizaciones } from '../services/documentacionApi';
import { ESTADOS, PERMISO_PUBLICAR, errorDetalle } from '../constants/secciones';

const { Text } = Typography;

const FILTROS = [
    { label: 'Todos', value: 'todos' },
    { label: 'Nuevos', value: 'nuevo' },
    { label: 'Con borrador', value: 'borrador' },
    { label: 'README cambió', value: 'readme' },
    { label: 'Retirados', value: 'retirado' },
];

const fecha = (iso) => (iso ? new Date(`${iso}Z`).toLocaleDateString('es-MX') : '—');

const coincide = (p, filtro) => {
    if (filtro === 'nuevo' || filtro === 'retirado') return p.estado === filtro;
    if (filtro === 'borrador') return p.borrador_pendiente;
    if (filtro === 'readme') return p.secciones_con_readme_nuevo > 0;
    return true;
};

export default function PipelinesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const puedePublicar = Boolean(user?.permissions?.includes?.(PERMISO_PUBLICAR));
    const [pipelines, setPipelines] = useState([]);
    const [sincronizaciones, setSincronizaciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('todos');

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const [lista, syncs] = await Promise.all([listarPipelines(), listarSincronizaciones()]);
            setPipelines(lista);
            setSincronizaciones(syncs);
        } catch (err) {
            message.error(errorDetalle(err, 'No se pudo cargar la documentación'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const cambiarVisible = async (clave, visible) => {
        try {
            await ajustarPipeline(clave, { visible });
            setPipelines((prev) => prev.map((p) => (p.clave === clave ? { ...p, visible } : p)));
        } catch (err) {
            message.error(errorDetalle(err, 'No se pudo cambiar la visibilidad'));
        }
    };

    const filtrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return pipelines.filter((p) => coincide(p, filtro)
            && (!texto || p.titulo.toLowerCase().includes(texto) || p.clave.includes(texto)));
    }, [pipelines, busqueda, filtro]);

    const columnas = [
        {
            title: 'Pipeline',
            dataIndex: 'titulo',
            render: (titulo, p) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{titulo}</Text>
                    <Text type="secondary" code>{p.clave}</Text>
                </Space>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            render: (estado, p) => (
                <Space size={4} wrap>
                    <Tag color={ESTADOS[estado]?.color}>{ESTADOS[estado]?.etiqueta ?? estado}</Tag>
                    {p.borrador_pendiente && <Tag>Borrador</Tag>}
                    {p.secciones_con_readme_nuevo > 0 && (
                        <Tooltip title="El README cambió en secciones que alguien editó a mano">
                            <Tag color="warning">README cambió</Tag>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
        {
            title: <TituloConAyuda titulo="Fuentes" ayuda="Dónde detectó el sincronizador este pipeline" />,
            dataIndex: 'fuentes_detectadas',
            render: (fuentes) => fuentes.map((f) => <Tag key={f}>{f}</Tag>),
        },
        { title: 'Visitas 30 días', dataIndex: 'visitas_30_dias', align: 'right' },
        { title: 'Publicado', dataIndex: 'publicado_en', render: fecha },
        {
            title: 'Visible',
            dataIndex: 'visible',
            render: (visible, p) => (
                <Switch
                    size="small"
                    checked={visible}
                    disabled={!puedePublicar}
                    onChange={(v) => cambiarVisible(p.clave, v)}
                />
            ),
        },
        {
            title: '',
            key: 'acciones',
            render: (_, p) => (
                <Button
                    shape="round"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/sieej/documentacion/${p.clave}`)}
                >
                    Editar
                </Button>
            ),
        },
    ];

    return (
        <>
            <PageHeading
                icon={<BookOutlined />}
                title="Documentación de pipelines"
                description="Lo que se publica en documentacion.sieej.iieg: secciones editables por pipeline, sobre datos que el sincronizador mantiene al día."
                extra={<Button shape="round" icon={<ReloadOutlined />} onClick={cargar} loading={loading}>Recargar</Button>}
            />
            <SincronizacionesPanel sincronizaciones={sincronizaciones} loading={loading} />
            <Space wrap style={{ marginBottom: 12 }}>
                <Input.Search allowClear placeholder="Buscar pipeline" onChange={(e) => setBusqueda(e.target.value)} style={{ width: 260 }} />
                <Segmented options={FILTROS} value={filtro} onChange={setFiltro} />
            </Space>
            <Table
                rowKey="clave"
                size="middle"
                loading={loading}
                columns={columnas}
                dataSource={filtrados}
                pagination={{ pageSize: 50, hideOnSinglePage: true }}
                scroll={{ x: 900 }}
            />
        </>
    );
}
