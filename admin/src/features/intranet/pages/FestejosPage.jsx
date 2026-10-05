import { Button, Tag } from 'antd';
import { PlayCircleOutlined, SmileOutlined } from '@ant-design/icons';

import PaginaRecurso from '../components/PaginaRecurso';
import { ANIMACIONES, lanzarFestejo, separarEmojis } from '../helpers/festejo';

const DEFINICION = {
    recurso: 'festejos',
    ordenable: {
        campo: 'orden',
        aPayload: (fila, valor) => ({ nombre: fila.nombre, emojis: fila.emojis, animacion: fila.animacion, orden: valor }),
    },
    singular: 'Festejo',
    titulo: 'Festejos',
    descripcion: 'Animaciones de emojis para el carrusel y los días de eventos de la intranet. Cambiar los emojis de uno lo cambia en todos lados.',
    alta: 'Nuevo festejo',
    vacio: 'Todavía no hay festejos',
    icono: <SmileOutlined />,
    columnas: [
        { title: 'Nombre', dataIndex: 'nombre' },
        { title: 'Emojis', dataIndex: 'emojis', render: (emojis) => <span style={{ fontSize: 22, letterSpacing: 4 }}>{emojis}</span> },
        {
            title: 'Animación', dataIndex: 'animacion', width: 130,
            render: (valor) => <Tag>{ANIMACIONES.find((a) => a.value === valor)?.label ?? valor}</Tag>,
        },
    ],
    campos: [
        { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, maximo: 60 },
        { nombre: 'emojis', etiqueta: 'Emojis', requerido: true, maximo: 64, ayuda: 'Los que van a explotar, pegados: 🎄⭐🎁' },
        { nombre: 'animacion', etiqueta: 'Animación', tipo: 'opciones', opciones: ANIMACIONES, requerido: true },
    ],
    aFormulario: (fila) => fila,
    aPayload: (valores) => ({ ...valores, animacion: valores.animacion ?? 'explosion' }),
};

const probar = (fila) => (
    <Button
        type="text"
        icon={<PlayCircleOutlined />}
        aria-label={`Probar ${fila.nombre}`}
        onClick={(evento) => lanzarFestejo(evento.clientX, evento.clientY, separarEmojis(fila.emojis))}
    />
);

const FestejosPage = () => <PaginaRecurso definicion={DEFINICION} acciones={probar} />;

export default FestejosPage;
