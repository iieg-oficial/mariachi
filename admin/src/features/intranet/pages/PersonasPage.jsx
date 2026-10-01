import { useState } from 'react';
import { Switch, Table, message } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';

import { cambiarPresencia } from '../api/intranetService';
import { useRecurso } from '../hooks/useRecurso';

const PERMISO = 'mariachi.intranet.manage';

const PersonasPage = () => {
    const { can } = useAuth();
    const puedeGestionar = can(PERMISO);
    const { filas, cargando, cargar } = useRecurso('personas', { singular: 'Persona' });
    const [cambiando, setCambiando] = useState(null);

    const alternar = async (persona, mostrar) => {
        setCambiando(persona.id);
        try {
            await cambiarPresencia(persona.id, !mostrar);
            message.success(mostrar ? 'Su cursor vuelve a verse' : 'Su cursor ya no se muestra');
            await cargar();
        } catch {
            message.error('No se pudo cambiar la presencia');
        } finally {
            setCambiando(null);
        }
    };

    const columnas = [
        { title: 'Nombre', dataIndex: 'nombre_completo' },
        { title: 'Correo', dataIndex: 'email', render: (correo) => correo || '—' },
        {
            title: 'Primer ingreso', dataIndex: 'created_at', width: 160,
            render: (fecha) => (fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'),
        },
        {
            title: 'Mostrar su cursor a los demás', dataIndex: 'oculto_en_presencia', width: 220,
            render: (oculto, persona) => (
                <Switch
                    checked={!oculto}
                    disabled={!puedeGestionar}
                    loading={cambiando === persona.id}
                    aria-label={`Mostrar el cursor de ${persona.nombre_completo}`}
                    onChange={(mostrar) => alternar(persona, mostrar)}
                />
            ),
        },
    ];

    return (
        <>
            <PageHeading
                icon={<TeamOutlined />}
                title="Personas"
                description="Quienes ya entraron a la intranet con minerva y si su cursor se ve en vivo."
            />
            <Table
                rowKey="id"
                size="middle"
                loading={cargando}
                dataSource={filas}
                columns={columnas}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
                locale={{ emptyText: 'Todavía nadie ha entrado a la intranet' }}
                scroll={{ x: 'max-content' }}
            />
        </>
    );
};

export default PersonasPage;
