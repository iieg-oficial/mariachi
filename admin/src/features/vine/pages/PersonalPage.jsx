import { TableOutlined, TeamOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Input, Space, Table, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router';

import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';
import { getPersonal } from '@features/vine/api/vineService';
import { COLUMNAS_PERSONAL } from '@features/vine/components/columnasPersonal';
import FichaPersona from '@features/vine/components/FichaPersona';

const { Text } = Typography;

const PERMISO_PERSONAS = 'mariachi.vine_personas.view';
const PERMISO_EDITAR = 'mariachi.vine_personas.update';

const unicos = (filas, campo) => [...new Set(filas.map((f) => f[campo]).filter(Boolean))]
    .sort()
    .map((v) => ({ text: v, value: v }));

const PersonalPage = () => {
    const { can } = useAuth();
    const puedeVer = can(PERMISO_PERSONAS);
    const puedeEditar = can(PERMISO_EDITAR);

    const [busqueda, setBusqueda] = useState('');
    const [paginacion, setPaginacion] = useState({ current: 1, pageSize: 25 });
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        if (!puedeVer) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            setFilas(await getPersonal(365, true));
        } catch (e) {
            setError(e?.response?.data?.detail || 'No se pudo cargar el directorio');
        } finally {
            setLoading(false);
        }
    }, [puedeVer]);

    useEffect(() => { cargar(); }, [cargar]);

    const columnas = useMemo(() => COLUMNAS_PERSONAL.map((c) => (
        c.filtrable ? { ...c, filters: unicos(filas, c.dataIndex) } : c
    )), [filas]);

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return filas;
        return filas.filter((f) => `${f.nombre ?? ''} ${f.pin} ${f.departamento ?? ''} ${f.email ?? ''}`
            .toLowerCase().includes(q));
    }, [filas, busqueda]);

    if (!puedeVer) {
        return (
            <div>
                <PageHeading icon={<TeamOutlined />} title="Personal" />
                <Alert
                    type="info"
                    showIcon
                    message="Esta sección necesita un permiso aparte"
                    description="El directorio muestra a cada persona con su nombre y su asistencia, que es dato personal laboral: se pide con «Vine - estadisticas con nombres»."
                />
            </div>
        );
    }

    return (
        <div>
            <PageHeading
                icon={<TeamOutlined />}
                title="Personal"
                description="Cada persona dada de alta en el biométrico. Despliega una fila para ver su asistencia y editar su ficha"
            />

            <Space wrap style={{ marginBottom: 16 }}>
                <Input.Search
                    allowClear
                    placeholder="Buscar por nombre, PIN, área o correo"
                    style={{ width: 320 }}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                {puedeEditar && (
                    <Link to="/vine/personal/tabla">
                        <Button icon={<TableOutlined />}>Captura masiva</Button>
                    </Link>
                )}
            </Space>

            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

            <Card size="small">
                <Table
                    size="small"
                    rowKey="pin"
                    loading={loading}
                    columns={columnas}
                    dataSource={visibles}
                    scroll={{ x: 900 }}
                    expandable={{
                        expandedRowRender: (fila) => <FichaPersona fila={fila} onGuardado={cargar} />,
                        rowExpandable: () => true,
                    }}
                    onChange={(p) => setPaginacion(p)}
                    pagination={{
                        ...paginacion,
                        showSizeChanger: true,
                        pageSizeOptions: [10, 25, 50, 100],
                        showTotal: (t) => `${t} personas`,
                    }}
                />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                    Quien nunca ha marcado aparece con
                    {' '}
                    <Tag>sin registro</Tag>
                    : está dado de alta en el biométrico pero no tiene un solo evento.
                </Text>
            </Card>
        </div>
    );
};

export default PersonalPage;
