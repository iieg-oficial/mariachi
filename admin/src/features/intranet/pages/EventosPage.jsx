import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import PaginaRecurso from '../components/PaginaRecurso';

const DEFINICION = {
    recurso: 'eventos',
    singular: 'Evento',
    titulo: 'Eventos',
    descripcion: 'Lo que pasa en el instituto: sale en naranja en el calendario de la intranet y en sus próximos días.',
    alta: 'Nuevo evento',
    vacio: 'Todavía no hay eventos',
    icono: <CalendarOutlined />,
    columnas: [
        { title: 'Fecha', dataIndex: 'fecha', width: 140, render: (fecha) => dayjs(fecha).format('DD/MM/YYYY') },
        { title: 'Título', dataIndex: 'titulo' },
        { title: 'Descripción', dataIndex: 'descripcion', render: (texto) => texto || '—' },
    ],
    campos: [
        { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
        { nombre: 'titulo', etiqueta: 'Título', requerido: true, maximo: 120 },
        { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto-largo', maximo: 300 },
    ],
    aPayload: (valores) => ({ ...valores, descripcion: valores.descripcion || null }),
};

const EventosPage = () => <PaginaRecurso definicion={DEFINICION} />;

export default EventosPage;
