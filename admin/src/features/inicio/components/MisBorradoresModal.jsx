import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button, Empty, Modal, Space, Spin, Table, Tag, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { getMisBorradores } from '@features/inicio/api/inicioService';

const { Text } = Typography;

const ESTADO_TAG = {
    en_progreso: { color: 'blue', label: 'En progreso' },
    pendiente_revision: { color: 'gold', label: 'En revisión' },
    rechazado: { color: 'red', label: 'Rechazado' },
};

const TIPO_LABEL = {
    'elementos-menu': 'Menú',
    evento: 'Evento',
    home_section: 'Inicio',
    page: 'Página',
};

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

const COLUMNAS = [
    {
        title: 'Tipo',
        key: 'tipo',
        width: 120,
        render: (_, r) => <Tag>{TIPO_LABEL[r.resource_type] || r.resource_type}</Tag>,
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
        render: (d) => (d
            ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
            : '—'),
    },
    {
        key: 'acciones',
        width: 120,
        render: (_, r) => (
            <Link to={editPath(r)}>
                <Button type="link" icon={<EditOutlined />} size="small">Continuar</Button>
            </Link>
        ),
    },
];

export default function MisBorradoresModal({ open, onClose, borradores, loading }) {
    const [cargados, setCargados] = useState(borradores || []);
    const [cargando, setCargando] = useState(false);
    const usaPropios = Array.isArray(borradores);

    useEffect(() => {
        if (!open || usaPropios) return;
        let cancelado = false;
        setCargando(true);
        getMisBorradores()
            .then((data) => { if (!cancelado) setCargados(data); })
            .catch(() => {})
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, [open, usaPropios]);

    const datos = usaPropios ? borradores : cargados;
    const esperando = usaPropios ? loading : cargando;
    const rechazados = datos.filter((b) => b.estado === 'rechazado').length;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={720}
            title={(
                <Space size={8}>
                    <span>Mis borradores</span>
                    {rechazados > 0 && <Tag color="red">{`${rechazados} rechazado${rechazados === 1 ? '' : 's'}`}</Tag>}
                </Space>
            )}
        >
            {esperando ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : datos.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={(
                        <Space orientation="vertical" size={4}>
                            <Text>No tienes borradores en progreso</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Empieza por <Link to="/mapalab/home" onClick={onClose}>editar el Inicio</Link>
                                {' o '}<Link to="/mapalab/eventos" onClick={onClose}>crear un evento</Link>.
                            </Text>
                        </Space>
                    )}
                />
            ) : (
                <Table
                    columns={COLUMNAS}
                    dataSource={datos}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    onRow={() => ({ onClick: onClose })}
                />
            )}
        </Modal>
    );
}
