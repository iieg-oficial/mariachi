import { useCallback, useEffect, useState } from 'react';
import { Button, Space, Table, Tag, Tooltip, message } from 'antd';
import { EditOutlined, EnvironmentOutlined, HistoryOutlined } from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';

import { editarEspacio, listarEspacios } from '../api/espaciosService';
import EditarEspacio from '../components/EditarEspacio';
import HistorialEspacio from '../components/HistorialEspacio';
import { TIPOS_ESPACIO } from '../constants/espacios';

const PERMISO = 'mariachi.intranet.manage';

const EspaciosPage = () => {
    const { can } = useAuth();
    const puedeGestionar = can(PERMISO);
    const [datos, setDatos] = useState({ espacios: [], pisos: [] });
    const [cargando, setCargando] = useState(false);
    const [enEdicion, setEnEdicion] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [conHistorial, setConHistorial] = useState(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setDatos(await listarEspacios());
        } catch {
            message.error('No se pudieron consultar los espacios');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const guardar = async (valores) => {
        setGuardando(true);
        try {
            await editarEspacio(enEdicion.fid, valores);
            message.success('Espacio actualizado');
            setEnEdicion(null);
            await cargar();
        } catch (error) {
            message.error(error?.response?.data?.detail ?? 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    const columnas = [
        { title: 'Nombre', dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre, 'es') },
        {
            title: 'Tipo', dataIndex: 'tipo', width: 180,
            filters: Object.entries(TIPOS_ESPACIO).map(([value, { texto }]) => ({ value, text: texto })),
            onFilter: (tipo, fila) => fila.tipo === tipo,
            render: (tipo) => <Tag color={TIPOS_ESPACIO[tipo]?.color}>{TIPOS_ESPACIO[tipo]?.texto ?? tipo}</Tag>,
        },
        { title: 'Piso', dataIndex: 'piso', width: 130 },
        { title: 'm²', dataIndex: 'area_m2', width: 90, sorter: (a, b) => a.area_m2 - b.area_m2 },
        {
            title: 'Trazo', dataIndex: 'aproximado', width: 120,
            render: (aproximado) => (aproximado ? <Tag color="warning">Aproximado</Tag> : <Tag>Del plano</Tag>),
        },
        {
            title: 'Se elige', dataIndex: 'incluir', width: 100,
            render: (incluir) => (incluir ? 'Sí' : 'No'),
        },
        {
            title: 'Acciones', key: 'acciones', width: 110,
            render: (_, fila) => (
                <Space size={4}>
                    {puedeGestionar && (
                        <Tooltip title="Editar">
                            <Button type="text" icon={<EditOutlined />} aria-label={`Editar ${fila.nombre}`} onClick={() => setEnEdicion(fila)} />
                        </Tooltip>
                    )}
                    <Tooltip title="Historial">
                        <Button type="text" icon={<HistoryOutlined />} aria-label={`Historial de ${fila.nombre}`} onClick={() => setConHistorial(fila)} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <>
            <PageHeading
                icon={<EnvironmentOutlined />}
                title="Espacios del instituto"
                description="Nombre, tipo y piso de cada espacio del edificio. El trazo se corrige en QGIS; cada cambio queda en su historial."
            />
            <Table
                rowKey="fid"
                size="middle"
                loading={cargando}
                dataSource={datos.espacios}
                columns={columnas}
                pagination={{ pageSize: 30, hideOnSinglePage: true }}
                locale={{ emptyText: 'Todavía no hay espacios cargados' }}
                scroll={{ x: 'max-content' }}
            />
            <EditarEspacio
                espacio={enEdicion}
                pisos={datos.pisos}
                guardando={guardando}
                onCancelar={() => setEnEdicion(null)}
                onGuardar={guardar}
            />
            <HistorialEspacio
                espacio={conHistorial}
                pisos={datos.pisos}
                puedeGestionar={puedeGestionar}
                onCerrar={() => setConHistorial(null)}
                onRestaurado={cargar}
            />
        </>
    );
};

export default EspaciosPage;
