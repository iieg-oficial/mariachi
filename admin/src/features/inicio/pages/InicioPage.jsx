import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Layout, Card, Typography, Space, Tag, Table, Button, Empty, Spin, Alert, Badge, Tooltip } from 'antd';
import {
    AuditOutlined,
    EditOutlined,
    ClusterOutlined,
    GithubOutlined,
    HomeOutlined,
    ProjectOutlined,
    LinkOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import SectionHeader from '@shared/components/SectionHeader';
import PageHeading from '@shared/components/PageHeading';
import {
    getMisBorradores,
    getBorradoresPendientes,
    getPlataformas,
    getColibriConfig,
} from '@features/inicio/api/inicioService';

const COLIBRI_WIDGET_URL = '/colibri/widget/colibri-widget.v1.js';
import { MapalabInicioHighlights } from '@features/mapalab-stats';

const { Content } = Layout;
const { Text } = Typography;

const ESTADO_TAG = {
    en_progreso: { color: 'blue', label: 'En progreso' },
    pendiente_revision: { color: 'gold', label: 'En revisión' },
    rechazado: { color: 'red', label: 'Rechazado' },
};

const tipoLabel = (resource_type) => ({
    'elementos-menu': 'Menú',
    'evento': 'Evento',
    'home_section': 'Inicio',
    'page': 'Página',
}[resource_type] || resource_type);

const editPath = (record) => {
    if (record.resource_type === 'elementos-menu') return `/menu?review=true&borrador=${record.id}`;
    if (record.resource_type === 'evento') return `/mapalab/eventos/${record.resource_id}/edit`;
    if (record.resource_type === 'home_section') return '/mapalab/home';
    return `/pages/edit/${record.resource_id}`;
};

const tituloRecurso = (record) => {
    if (record.resource_type === 'home_section') return record.resource_id;
    return record.data?.titulo || record.data?.title || record.resource_id;
};


const IconLink = ({ href, title, icon, external = false }) => {
    const trigger = (
        <Button
            type="text"
            size="small"
            icon={icon}
            aria-label={title}
            style={{ color: 'rgba(0,0,0,0.45)' }}
        />
    );
    const wrapper = external
        ? <a href={href} target="_blank" rel="noopener noreferrer">{trigger}</a>
        : <Link to={href}>{trigger}</Link>;
    return <Tooltip title={title}>{wrapper}</Tooltip>;
};

const STATUS_BADGE = {
    ok: { status: 'success', text: 'operativa' },
    degraded: { status: 'warning', text: 'degradada' },
    down: { status: 'error', text: 'caída' },
    unreachable: { status: 'error', text: 'no responde' },
};

const PlataformaCard = ({ plataforma, colibriConfig }) => {
    const {
        slug, label, url, repo, taiga, version, healthy,
        status, since_human: sinceHuman, uptime_24h: uptime24h,
        containers, detail, monitored,
    } = plataforma;

    const versionTag = version
        ? <Tag color="blue">v{version}</Tag>
        : <Tag color="default">sin versión</Tag>;

    let statusBadge;
    if (monitored && status) {
        const badge = STATUS_BADGE[status] ?? { status: 'default', text: status };
        const tip = [
            sinceHuman && `Desde ${sinceHuman}`,
            detail,
            uptime24h != null && `Disponibilidad 24 h: ${uptime24h}%`,
        ].filter(Boolean).join(' · ');
        statusBadge = tip
            ? <Tooltip title={tip}><Badge status={badge.status} text={badge.text} /></Tooltip>
            : <Badge status={badge.status} text={badge.text} />;
    } else if (healthy) {
        statusBadge = <Badge status="success" text="activa" />;
    } else {
        statusBadge = (
            <Tooltip title="No respondió al endpoint /ontoy">
                <Badge status="default" text="no integrada" />
            </Tooltip>
        );
    }

    const contadorContenedores = containers?.total
        ? (
            <Tooltip title={`${containers.running} de ${containers.total} contenedores corriendo`}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                    {containers.running}/{containers.total} cont.
                </Text>
            </Tooltip>
        )
        : null;

    const openColibri = () => {
        if (!window.colibri?.openPanel || !colibriConfig?.api_key) return;
        window.colibri.setContext('plataforma_slug', slug);
        window.colibri.setContext('plataforma_label', label);
        window.colibri.openPanel({
            sourceApp: colibriConfig.source_app,
            apiKey: colibriConfig.api_key,
        });
    };

    const acciones = [];
    if (url && healthy) acciones.push(
        <IconLink key="visit" href={url} title={`Abrir ${label}`} icon={<LinkOutlined />} />
    );
    if (repo) acciones.push(
        <IconLink key="repo" href={repo} title="Repositorio" icon={<GithubOutlined />} external />
    );
    if (taiga) acciones.push(
        <IconLink key="taiga" href={taiga} title="Tablero Taiga" icon={<ProjectOutlined />} external />
    );
    if (colibriConfig?.api_key) acciones.push(
        <Tooltip key="reportar" title={`Reportar sobre ${label}`}>
            <Button
                type="text"
                size="small"
                icon={<MessageOutlined />}
                aria-label={`Reportar sobre ${label}`}
                onClick={openColibri}
                style={{ color: 'rgba(0,0,0,0.45)' }}
            />
        </Tooltip>
    );

    return (
        <Card size="small" styles={{ body: { padding: 16 } }}>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Text strong style={{ fontSize: 16 }}>{label}</Text>
                    {versionTag}
                </Space>
                {contadorContenedores && (
                    <Space style={{ justifyContent: 'flex-end', width: '100%' }} size={0}>
                        {contadorContenedores}
                    </Space>
                )}
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    {statusBadge}
                    {acciones.length > 0 && <Space size={0}>{acciones}</Space>}
                </Space>
            </Space>
        </Card>
    );
};


export default function InicioPage() {
    const { user } = useAuth();
    const [misBorradores, setMisBorradores] = useState([]);
    const [pendientes, setPendientes] = useState([]);
    const [plataformas, setPlataformas] = useState([]);
    const [colibriConfig, setColibriConfig] = useState(null);
    const [loadingBorradores, setLoadingBorradores] = useState(true);
    const [loadingPlataformas, setLoadingPlataformas] = useState(true);
    const isAdmin = user?.role === 'tetlamamakani';

    useEffect(() => {
        let cancelled = false;
        const tasks = [getMisBorradores()];
        if (isAdmin) tasks.push(getBorradoresPendientes());

        Promise.all(tasks)
            .then(([mios, pend]) => {
                if (cancelled) return;
                setMisBorradores(mios);
                if (pend) setPendientes(pend);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoadingBorradores(false); });

        return () => { cancelled = true; };
    }, [isAdmin]);

    useEffect(() => {
        let cancelled = false;
        getPlataformas()
            .then((data) => { if (!cancelled) setPlataformas(data); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoadingPlataformas(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getColibriConfig()
            .then((data) => {
                if (cancelled || !data?.api_key) return;
                setColibriConfig(data);
                if (!document.querySelector('script[data-colibri-widget]')) {
                    const script = document.createElement('script');
                    script.src = COLIBRI_WIDGET_URL;
                    script.defer = true;
                    script.dataset.colibriWidget = 'true';
                    document.head.appendChild(script);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const rechazados = useMemo(
        () => misBorradores.filter((b) => b.estado === 'rechazado'),
        [misBorradores],
    );

    const columnsBorradores = [
        {
            title: 'Tipo',
            key: 'tipo',
            width: 120,
            render: (_, r) => <Tag>{tipoLabel(r.resource_type)}</Tag>,
        },
        {
            title: 'Recurso',
            key: 'titulo',
            render: (_, r) => <Text>{tituloRecurso(r)}</Text>,
        },
        {
            title: 'Estado',
            key: 'estado',
            width: 140,
            render: (_, r) => {
                const cfg = ESTADO_TAG[r.estado] || { color: 'default', label: r.estado };
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
        {
            title: 'Última edición',
            dataIndex: 'actualizado_en',
            key: 'actualizado_en',
            width: 180,
            render: (d) => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—',
        },
        {
            key: 'acciones',
            width: 80,
            render: (_, r) => (
                <Link to={editPath(r)}>
                    <Button type="link" icon={<EditOutlined />} size="small">Continuar</Button>
                </Link>
            ),
        },
    ];

    return (
        <Content style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <PageHeading
                    icon={<HomeOutlined />}
                    title={`Hola, ${user?.name || 'editor'}`}
                    description={`Bienvenida a Mariachi · ${user?.role}`}
                    marginBottom={0}
                />

                {rechazados.length > 0 && (
                    <Alert closable
                        type="error"
                        showIcon
                        message={`Tienes ${rechazados.length} borrador${rechazados.length === 1 ? '' : 'es'} rechazado${rechazados.length === 1 ? '' : 's'}`}
                        description="Revísalos y aplícales los cambios solicitados antes de volver a enviar a revisión."
                    />
                )}

                {isAdmin && pendientes.length > 0 && (
                    <Card size="small">
                        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                            <Space>
                                <AuditOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
                                <div>
                                    <Text strong>{pendientes.length} borrador{pendientes.length === 1 ? '' : 'es'} esperando tu revisión</Text>
                                    <br />
                                    <Text type="secondary">Aprueba o rechaza los cambios enviados por las editoras.</Text>
                                </div>
                            </Space>
                            <Link to="/revision">
                                <Button type="primary">Revisar ahora</Button>
                            </Link>
                        </Space>
                    </Card>
                )}

                <Card title="Mis borradores" size="small">
                    {loadingBorradores ? (
                        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                    ) : misBorradores.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <Space orientation="vertical" size={4}>
                                    <Text>No tienes borradores en progreso</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Empieza por <Link to="/mapalab/home">editar el Inicio</Link> o <Link to="/mapalab/eventos">crear un evento</Link>.
                                    </Text>
                                </Space>
                            }
                        />
                    ) : (
                        <Table
                            columns={columnsBorradores}
                            dataSource={misBorradores}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            scroll={{ x: 'max-content' }}
                        />
                    )}
                </Card>

                <div>
                    <SectionHeader
                        icon={<ClusterOutlined />}
                        title="Huachicol"
                        subtitle="Estatus de ecosistema"
                        to="/huachicol/observabilidad"
                    />
                    {loadingPlataformas ? (
                        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 16,
                        }}>
                            {plataformas.map((p) => (
                                <PlataformaCard key={p.slug} plataforma={p} colibriConfig={colibriConfig} />
                            ))}
                        </div>
                    )}
                </div>

                <MapalabInicioHighlights />
            </Space>
        </Content>
    );
}
