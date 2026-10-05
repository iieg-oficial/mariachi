import { Button, Tag, Tooltip, message } from 'antd';
import { CheckOutlined, CloseOutlined, UserAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import PaginaRecurso from '../components/PaginaRecurso';
import { actualizar } from '../api/intranetService';

const ESTADOS = {
    pendiente: { color: 'warning', texto: 'Pendiente' },
    aprobada: { color: 'success', texto: 'Aprobada' },
    rechazada: { color: 'default', texto: 'Rechazada' },
};

const fecha = (valor) => (valor ? dayjs(valor).format('DD/MM/YYYY HH:mm') : '—');

const DEFINICION = {
    recurso: 'solicitudes',
    singular: 'Solicitud',
    titulo: 'Solicitudes de cuenta',
    descripcion: 'Quien pide entrar a la intranet. Al aprobar, crea su invitación en el panel de minerva.',
    alta: null,
    editable: false,
    vacio: 'No hay solicitudes',
    icono: <UserAddOutlined />,
    columnas: [
        { title: 'Nombre', dataIndex: 'nombre' },
        { title: 'Correo', dataIndex: 'correo' },
        { title: 'Dirección o área', dataIndex: 'area' },
        { title: 'Para qué', dataIndex: 'motivo', render: (motivo) => motivo || '—' },
        { title: 'Pidió', dataIndex: 'created_at', width: 150, render: fecha },
        {
            title: 'Estado', dataIndex: 'estado', width: 200,
            render: (estado, fila) => (
                <Tooltip title={fila.atendida_por ? `${fila.atendida_por} · ${fecha(fila.atendida_en)}` : undefined}>
                    <Tag color={ESTADOS[estado]?.color}>{ESTADOS[estado]?.texto ?? estado}</Tag>
                </Tooltip>
            ),
        },
    ],
    campos: [],
};

const atender = async (fila, estado, recargar) => {
    try {
        await actualizar('solicitudes', fila.id, { estado });
        message.success(estado === 'aprobada' ? 'Aprobada: crea su invitación en minerva' : 'Solicitud rechazada');
        await recargar();
    } catch {
        message.error('No se pudo atender la solicitud');
    }
};

const accionesDeSolicitud = (fila, recargar) => {
    if (fila.estado !== 'pendiente') return null;
    return (
        <>
            <Tooltip title="Aprobar">
                <Button type="text" icon={<CheckOutlined />} aria-label={`Aprobar a ${fila.nombre}`} onClick={() => atender(fila, 'aprobada', recargar)} />
            </Tooltip>
            <Tooltip title="Rechazar">
                <Button type="text" icon={<CloseOutlined />} aria-label={`Rechazar a ${fila.nombre}`} onClick={() => atender(fila, 'rechazada', recargar)} />
            </Tooltip>
        </>
    );
};

const SolicitudesPage = () => <PaginaRecurso definicion={DEFINICION} acciones={accionesDeSolicitud} />;

export default SolicitudesPage;
