import { Button, Tag, Tooltip, message } from 'antd';
import { CheckOutlined, CloseOutlined, NotificationOutlined } from '@ant-design/icons';

import Miniatura from '../components/Miniatura';
import PaginaRecurso from '../components/PaginaRecurso';
import { aFormData, revisar } from '../api/intranetService';
import { aPayload } from '../helpers/carrusel';
import { AYUDA_PUBLICO, ESTADOS_CARRUSEL, IMAGENES } from '../constants/campos';

const AYUDA_FONDO = 'El color de la franja del aviso: un color (#1A2B3C) o un degradado (linear-gradient(...)). '
    + 'Vacío, va en el morado institucional.';
const AYUDA_ENLACE = 'https://… o una página de la intranet, como /calendario. @festejo (o @festejo:🎃🌼) hace explotar emojis en lugar de navegar. Vacío, el aviso no lleva botón.';
const AYUDA_BOTON = 'Vacío, el botón dice «Leer más».';

const CAMPOS = [
    { nombre: 'name', etiqueta: 'Nombre', requerido: true, maximo: 100 },
    { nombre: 'title', etiqueta: 'Título', requerido: true, maximo: 150 },
    { nombre: 'description', etiqueta: 'Descripción', tipo: 'texto-largo', maximo: 2000 },
    { nombre: 'avatar_file', etiqueta: 'Foto de quien publica', tipo: 'archivo', acepta: IMAGENES, ayuda: AYUDA_PUBLICO },
    { nombre: 'background_file', etiqueta: 'Imagen del aviso', tipo: 'archivo', acepta: IMAGENES },
    { nombre: 'background_url', etiqueta: 'Color de la franja', maximo: 500, ayuda: AYUDA_FONDO },
    { nombre: 'enlace', etiqueta: 'Enlace del botón', maximo: 500, ayuda: AYUDA_ENLACE },
    { nombre: 'boton', etiqueta: 'Texto del botón', maximo: 40, ayuda: AYUDA_BOTON },
    { nombre: 'order', etiqueta: 'Orden', tipo: 'numero' },
    { nombre: 'active', etiqueta: 'Visible', tipo: 'interruptor' },
];

const COLUMNAS = [
    {
        title: 'Imagen', dataIndex: 'avatar_url', width: 90,
        render: (ruta, fila) => <Miniatura ruta={ruta} alt={fila.name} />,
    },
    { title: 'Nombre', dataIndex: 'name' },
    { title: 'Título', dataIndex: 'title' },
    {
        title: 'Estado', dataIndex: 'status', width: 120,
        render: (estado) => (
            <Tag color={ESTADOS_CARRUSEL[estado]?.color}>{ESTADOS_CARRUSEL[estado]?.texto}</Tag>
        ),
    },
    { title: 'Visible', dataIndex: 'active', width: 90, render: (activo) => (activo ? 'Sí' : 'No') },
];

const DEFINICION = {
    recurso: 'carrusel',
    ordenable: { campo: 'order', aPayload: (_, valor) => aFormData({ order: valor }) },
    singular: 'Elemento',
    titulo: 'Carrusel',
    descripcion: 'Avisos de la portada de la intranet. Lo que proponen los empleados llega como pendiente.',
    alta: 'Nuevo elemento',
    vacio: 'Todavía no hay elementos en el carrusel',
    icono: <NotificationOutlined />,
    columnas: COLUMNAS,
    campos: CAMPOS,
    aPayload,
};

const resolver = async (fila, estado, recargar) => {
    try {
        await revisar(fila.id, estado);
        message.success(estado === 'aprobado' ? 'Elemento publicado' : 'Elemento rechazado');
        await recargar();
    } catch {
        message.error('No se pudo revisar el elemento');
    }
};

const accionesDeRevision = (fila, recargar) => {
    if (fila.status !== 'pendiente') return null;
    return (
        <>
            <Tooltip title="Publicar">
                <Button
                    type="text"
                    icon={<CheckOutlined />}
                    aria-label="Publicar elemento"
                    onClick={() => resolver(fila, 'aprobado', recargar)}
                />
            </Tooltip>
            <Tooltip title="Rechazar">
                <Button
                    type="text"
                    icon={<CloseOutlined />}
                    aria-label="Rechazar elemento"
                    onClick={() => resolver(fila, 'rechazado', recargar)}
                />
            </Tooltip>
        </>
    );
};

const CarruselPage = () => <PaginaRecurso definicion={DEFINICION} acciones={accionesDeRevision} />;

export default CarruselPage;
