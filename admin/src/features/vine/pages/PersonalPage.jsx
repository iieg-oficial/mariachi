import { TableOutlined, TeamOutlined } from '@ant-design/icons';
import {
    Alert, Button, Card, Input, Space, Table, Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router';

import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';
import { getPersonal } from '@features/vine/api/vineService';
import { columnasPersonal } from '@features/vine/components/columnasPersonal';
import DescargaDirectorio from '@features/vine/components/DescargaDirectorio';
import FichaPersona from '@features/vine/components/FichaPersona';
import ConfiguracionPersonal from '@features/vine/components/ConfiguracionPersonal';
import { DIMENSIONES, SIN_CONFIGURACION, aplicarConfiguracion } from '@features/vine/constants/filtros';

const { Text } = Typography;

const PERMISO_PERSONAS = 'mariachi.vine_personas.view';
const PERMISO_EDITAR = 'mariachi.vine_personas.update';

const DIAS = 365;

const PersonalPage = () => {
    const { can } = useAuth();
    const puedeVer = can(PERMISO_PERSONAS);
    const puedeEditar = can(PERMISO_EDITAR);

    const [busqueda, setBusqueda] = useState('');
    const [configuracion, setConfiguracion] = useState(SIN_CONFIGURACION);
    const [paginacion, setPaginacion] = useState({ current: 1, pageSize: 25 });
    const [expandidas, setExpandidas] = useState([]);
    const [tabs, setTabs] = useState({});
    const [dias, setDias] = useState({});
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        if (!puedeVer) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            setFilas(await getPersonal(DIAS, true));
        } catch (e) {
            setError(e?.response?.data?.detail || 'No se pudo cargar el directorio');
        } finally {
            setLoading(false);
        }
    }, [puedeVer]);

    useEffect(() => { cargar(); }, [cargar]);

    const abrir = useCallback((pin, tab, dia) => {
        setTabs((t) => ({ ...t, [pin]: tab }));
        if (dia) setDias((d) => ({ ...d, [pin]: dia }));
        setExpandidas((e) => (e.includes(pin) ? e : [...e, pin]));
    }, []);

    const columnas = useMemo(
        () => columnasPersonal(abrir, DIMENSIONES[0]),
        [abrir],
    );

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        const filtradas = aplicarConfiguracion(filas, configuracion);
        if (!q) return filtradas;
        return filtradas.filter((f) => `${f.nombre ?? ''} ${f.pin} ${f.departamento ?? ''} ${f.email ?? ''}`
            .toLowerCase().includes(q));
    }, [filas, busqueda, configuracion]);

    if (!puedeVer) {
        return (
            <div>
                <PageHeading icon={<TeamOutlined />} title="Personal" />
                <Alert
                    type="info"
                    showIcon
                    title="Esta sección necesita un permiso aparte"
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
                description="Cada persona dada de alta en el biométrico y tarjetas."
                extra={(
                    <Space size={8} wrap>
                        <Input.Search
                            allowClear
                            placeholder="Buscar por nombre, PIN, área o correo"
                            style={{ width: 'min(300px, 100%)' }}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <ConfiguracionPersonal filas={filas} valores={configuracion} onCambio={setConfiguracion} />
                        <DescargaDirectorio pins={visibles.map((f) => f.pin)} dias={DIAS} />
                        {puedeEditar && (
                            <Link to="/vine/personal/tabla">
                                <Button type="primary" icon={<TableOutlined />}>Captura masiva</Button>
                            </Link>
                        )}
                    </Space>
                )}
            />

            {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

            <Card size="small">
                <Table
                    size="small"
                    rowKey="pin"
                    loading={loading}
                    columns={columnas}
                    dataSource={visibles}
                    scroll={{ x: 640 }}
                    expandable={{
                        expandedRowKeys: expandidas,
                        onExpandedRowsChange: setExpandidas,
                        expandedRowRender: (fila) => (
                            <FichaPersona
                                fila={fila}
                                onGuardado={cargar}
                                tab={tabs[fila.pin] ?? 'ficha'}
                                onTab={(k) => setTabs((t) => ({ ...t, [fila.pin]: k }))}
                                dia={dias[fila.pin]}
                            />
                        ),
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
                    La fecha de alta viene del biométrico, donde está capturada en 3 de 293
                    personas; el resto muestra con ~ su alta en el control de acceso, que no es lo
                    mismo. Se corrige en la ficha. Las bajas se muestran desde el engrane.
                </Text>
            </Card>
        </div>
    );
};

export default PersonalPage;
