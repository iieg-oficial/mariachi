import { CalendarOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import dayjs from 'dayjs';

import PaginaRecurso from '../components/PaginaRecurso';
import { useFestejos } from '../hooks/useFestejos';

const definicionCon = (festejos) => ({
    recurso: 'eventos',
    singular: 'Evento',
    titulo: 'Eventos',
    descripcion: 'Lo que pasa en el instituto: sale en naranja en el calendario de la intranet y en sus próximos días.',
    alta: 'Nuevo evento',
    vacio: 'Todavía no hay eventos',
    icono: <CalendarOutlined />,
    columnas: [
        { title: 'Fecha', dataIndex: 'fecha', width: 140, render: (fecha) => dayjs(fecha).format('DD/MM/YYYY') },
        { title: '', dataIndex: 'emoji', width: 56, render: (emoji) => emoji || '' },
        { title: 'Título', dataIndex: 'titulo' },
        { title: 'Descripción', dataIndex: 'descripcion', render: (texto) => texto || '—' },
    ],
    campos: [
        { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
        { nombre: 'titulo', etiqueta: 'Título', requerido: true, maximo: 120 },
        { nombre: 'emoji', etiqueta: 'Emoji', maximo: 16, ayuda: 'Opcional. Se ve en la esquina del día en el calendario, por ejemplo 🎃 o 🌼.' },
        { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto-largo', maximo: 300 },
        {
            nombre: 'festejo_id', etiqueta: 'Festejo al tocar el día', tipo: 'opciones',
            opciones: festejos.map((f) => ({ value: f.id, label: `${f.emojis} ${f.nombre}` })),
            ayuda: 'Vacío, explota el emoji del evento.',
        },
    ],
    aPayload: (valores) => ({ ...valores, descripcion: valores.descripcion || null, emoji: valores.emoji || null, festejo_id: valores.festejo_id ?? null }),
});

const EventosPage = () => {
    const festejos = useFestejos();
    const definicion = useMemo(() => definicionCon(festejos), [festejos]);
    return <PaginaRecurso definicion={definicion} />;
};

export default EventosPage;
