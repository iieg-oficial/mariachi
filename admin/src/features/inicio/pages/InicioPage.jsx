import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Layout, Card, Typography, Space, Tag, Table, Button, Empty, Spin, Alert, Collapse, Badge, Tooltip } from 'antd';
import {
    AuditOutlined,
    EditOutlined,
    AppstoreOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import Markdown from '@shared/components/Markdown';
import {
    getMisBorradores,
    getBorradoresPendientes,
    getPlataformas,
    getNotasVersion,
} from '@features/inicio/api/inicioService';

const { Content } = Layout;
const { Title, Text } = Typography;

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


const PlataformaCard = ({ plataforma }) => {
    const { slug, label, url, version, healthy } = plataforma;
    const versionTag = version
        ? <Tag color="blue">v{version}</Tag>
        : <Tag color="default">sin versión</Tag>;
    const statusBadge = healthy
        ? <Badge status="success" text="activa" />
        : <Tooltip title="No respondió al endpoint /ontoy"><Badge status="default" text="no integrada" /></Tooltip>;

    const body = (
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Text strong style={{ fontSize: 16 }}>{label}</Text>
                {versionTag}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>{slug}</Text>
            {statusBadge}
        </Space>
    );

    if (url && healthy) {
        return (
            <Link to={url} style={{ display: 'block', height: '100%' }}>
                <Card hoverable size="small" styles={{ body: { padding: 16 } }}>{body}</Card>
            </Link>
        );
    }
    return <Card size="small" styles={{ body: { padding: 16 } }}>{body}</Card>;
};


export default function InicioPage() {
    const { user } = useAuth();
    const [misBorradores, setMisBorradores] = useState([]);
    const [pendientes, setPendientes] = useState([]);
    const [plataformas, setPlataformas] = useState([]);
    const [notasVersion, setNotasVersion] = useState([]);
    const [loadingBorradores, setLoadingBorradores] = useState(true);
    const [loadingPlataformas, setLoadingPlataformas] = useState(true);
    const [loadingNotas, setLoadingNotas] = useState(true);
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
        getNotasVersion(5)
            .then((data) => { if (!cancelled) setNotasVersion(data); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoadingNotas(false); });
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

    const notasItems = notasVersion.map((release) => ({
        key: release.version,
        label: (
            <Space>
                <Tag color="blue">v{release.version}</Tag>
                {release.fecha && <Text type="secondary" style={{ fontSize: 12 }}>{release.fecha}</Text>}
            </Space>
        ),
        children: (
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                {release.secciones.map((sec, i) => (
                    <div key={i}>
                        {sec.titulo && <Text strong>{sec.titulo}</Text>}
                        <Markdown text={sec.contenido} />
                    </div>
                ))}
            </Space>
        ),
    }));

    return (
        <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>
                        Hola, {user?.name || 'editor'}
                    </Title>
                    <Text type="secondary">Bienvenida a Mariachi · {user?.role}</Text>
                </div>

                {rechazados.length > 0 && (
                    <Alert
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
                        />
                    )}
                </Card>

                <div>
                    <Title level={4} style={{ marginBottom: 12 }}>
                        <AppstoreOutlined /> Plataformas del ecosistema
                    </Title>
                    {loadingPlataformas ? (
                        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 16,
                        }}>
                            {plataformas.map((p) => <PlataformaCard key={p.slug} plataforma={p} />)}
                        </div>
                    )}
                </div>

                <div>
                    <Title level={4} style={{ marginBottom: 12 }}>
                        <FileTextOutlined /> Notas de versión
                    </Title>
                    {loadingNotas ? (
                        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                    ) : notasVersion.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin notas disponibles" />
                    ) : (
                        <Collapse items={notasItems} defaultActiveKey={[notasVersion[0]?.version]} />
                    )}
                </div>
            </Space>
        </Content>
    );
}
