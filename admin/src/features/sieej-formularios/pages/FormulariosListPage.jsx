import { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Button, Card, Col, Empty, Form, Input, Modal, Row, Select, Space,
    Typography,
} from 'antd';
import {
    PlusOutlined, FormOutlined, TeamOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';
import useFormularioAcciones from '../hooks/useFormularioAcciones';
import FormularioCard from '../components/FormularioCard';
import EliminarFormularioModal from '../components/EliminarFormularioModal';

const { Title, Text } = Typography;

const SORT_OPTIONS = [
    { value: '-actualizado_en', label: 'Más recientes' },
    { value: 'nombre', label: 'Nombre A-Z' },
    { value: '-creado_en', label: 'Antiguos primero' },
];

const DEFAULT_DEFINICION = {
    version: 1,
    steps: [
        {
            id: 'general',
            type: 'form',
            title: 'Datos generales',
            fields: [
                { name: 'razon_social', label: 'Razon social', type: 'text', required: true },
            ],
        },
    ],
};

const matches = (f, q) => {
    if (!q) return true;
    const t = q.trim().toLowerCase();
    return (
        f.nombre?.toLowerCase().includes(t) ||
        f.slug?.toLowerCase().includes(t) ||
        f.descripcion?.toLowerCase().includes(t)
    );
};

const sortFns = {
    '-actualizado_en': (a, b) => (b.actualizado_en || '').localeCompare(a.actualizado_en || ''),
    'nombre': (a, b) => (a.nombre || '').localeCompare(b.nombre || ''),
    '-creado_en': (a, b) => (a.creado_en || '').localeCompare(b.creado_en || ''),
};

export default function FormulariosListPage() {
    const navigate = useNavigate();
    const { isMobile } = useIsMobile();
    const [formularios, setFormularios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const [q, setQ] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [sort, setSort] = useState('-actualizado_en');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await formulariosApi.list();
            setFormularios(data);
        } catch (err) {
            if (err?.response?.status !== 404) message.error('Error al cargar formularios');
            setFormularios([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const [presencia, setPresencia] = useState({});

    useEffect(() => {
        let vigente = true;
        const consultar = async () => {
            if (document.hidden) return;
            try {
                const data = await formulariosApi.presenciaGlobal();
                if (vigente) setPresencia(data);
            } catch {
                if (vigente) setPresencia({});
            }
        };
        consultar();
        const timer = setInterval(consultar, 20000);
        return () => { vigente = false; clearInterval(timer); };
    }, []);

    const visibles = useMemo(() => {
        let list = [...formularios];
        if (estadoFiltro) list = list.filter((f) => f.estado === estadoFiltro);
        list = list.filter((f) => matches(f, q));
        const fn = sortFns[sort] || sortFns['-actualizado_en'];
        list.sort(fn);
        return list;
    }, [formularios, q, estadoFiltro, sort]);

    const handleCreate = () => {
        form.resetFields();
        setModalOpen(true);
    };

    const handleSubmitNew = async (values) => {
        try {
            const created = await formulariosApi.create({
                slug: values.slug,
                nombre: values.nombre,
                descripcion: values.descripcion,
                definicion: DEFAULT_DEFINICION,
            });
            message.success('Formulario creado');
            setModalOpen(false);
            navigate(`/sieej/formularios/${created.slug}`);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al crear');
        }
    };

    const acciones = useFormularioAcciones(load);
    const [aEliminar, setAEliminar] = useState(null);

    const totalConFiltros = formularios.length > 0;

    return (
        <div>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: 12,
                marginBottom: 16,
            }}>
                <Space>
                    <FormOutlined style={{ fontSize: 20 }} />
                    <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>SIEEJ — Formularios</Title>
                </Space>
                <Space>
                    <Button icon={<TeamOutlined />} onClick={() => navigate('/sieej/grupos')}>
                        Grupos
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} block={isMobile}>
                        Nuevo formulario
                    </Button>
                </Space>
            </div>

            {totalConFiltros && (
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={12}>
                        <Input
                            allowClear
                            prefix={<SearchOutlined />}
                            placeholder="Buscar por nombre, slug o descripción..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </Col>
                    <Col xs={12} md={6}>
                        <Select
                            value={estadoFiltro}
                            onChange={setEstadoFiltro}
                            style={{ width: '100%' }}
                            options={[
                                { value: '', label: 'Todos los estados' },
                                { value: 'borrador', label: 'Borradores' },
                                { value: 'activo', label: 'Activos' },
                                { value: 'cerrado', label: 'Cerrados' },
                            ]}
                        />
                    </Col>
                    <Col xs={12} md={6}>
                        <Select
                            value={sort}
                            onChange={setSort}
                            style={{ width: '100%' }}
                            options={SORT_OPTIONS}
                        />
                    </Col>
                </Row>
            )}

            {loading ? (
                <Row gutter={[16, 16]}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Col key={i} xs={24} sm={12} lg={8} xl={6}>
                            <Card loading />
                        </Col>
                    ))}
                </Row>
            ) : visibles.length === 0 ? (
                <Card>
                    <Empty
                        description={
                            formularios.length === 0
                                ? 'Aún no hay formularios. Usa "Nuevo formulario" para crear el primero.'
                                : `Sin resultados con los filtros actuales${q ? ` para "${q}"` : ''}.`
                        }
                    />
                </Card>
            ) : (
                <>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                        {visibles.length} formulario{visibles.length === 1 ? '' : 's'}
                        {(q || estadoFiltro) && ` de ${formularios.length}`}
                    </Text>
                    <Row gutter={[16, 16]}>
                        {visibles.map((f) => (
                            <Col key={f.id} xs={24} sm={12} lg={8} xl={6}>
                                <FormularioCard
                                    formulario={f}
                                    editores={presencia[String(f.id)] ?? []}
                                    onEditar={() => navigate(`/sieej/formularios/${f.slug}`)}
                                    onEnvios={() => navigate(`/sieej/formularios/${f.slug}?tab=envios`)}
                                    onAsignaciones={() => navigate(`/sieej/formularios/${f.slug}?tab=asignaciones`)}
                                    onPublicar={() => acciones.publicar(f)}
                                    onCerrar={() => acciones.cerrar(f)}
                                    onReabrir={() => acciones.reabrir(f)}
                                    onEliminar={() => setAEliminar(f)}
                                />
                            </Col>
                        ))}
                    </Row>
                </>
            )}

            <EliminarFormularioModal
                formulario={aEliminar}
                open={!!aEliminar}
                onClose={() => setAEliminar(null)}
                onDone={load}
            />

            <Modal
                title="Nuevo formulario"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                okText="Crear"
                cancelText="Cancelar"
                width={isMobile ? '100%' : 560}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmitNew}>
                    <Form.Item
                        label="Slug"
                        name="slug"
                        rules={[
                            { required: true, message: 'Slug requerido' },
                            { pattern: /^[a-z0-9][a-z0-9-_]*$/, message: 'Solo minusculas, dígitos, - y _' },
                        ]}
                    >
                        <Input placeholder="registro-ciudadano" />
                    </Form.Item>
                    <Form.Item
                        label="Nombre"
                        name="nombre"
                        rules={[{ required: true, message: 'Nombre requerido' }]}
                    >
                        <Input placeholder="Registro ciudadano" />
                    </Form.Item>
                    <Form.Item label="Descripción" name="descripcion">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
