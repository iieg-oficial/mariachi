import { Button, Tag, Tooltip, message } from 'antd';
import { CheckOutlined, CloseOutlined, NotificationOutlined } from '@ant-design/icons';

import Miniatura from '../components/Miniatura';
import PaginaRecurso from '../components/PaginaRecurso';
import { aFormData, revisar } from '../api/intranetService';
import { AYUDA_PUBLICO, ESTADOS_CARRUSEL, IMAGENES } from '../constants/campos';

const AYUDA_FONDO = 'Un color (#1A2B3C) o un degradado (linear-gradient(...)). Si además eliges una '
    + 'imagen de fondo, gana la imagen.';

const CAMPOS = [
    { nombre: 'name', etiqueta: 'Nombre', requerido: true, maximo: 100 },
    { nombre: 'title', etiqueta: 'Título', requerido: true, maximo: 150 },
    { nombre: 'description', etiqueta: 'Descripción', tipo: 'texto-largo', maximo: 2000 },
    { nombre: 'avatar_file', etiqueta: 'Imagen', tipo: 'archivo', acepta: IMAGENES, ayuda: AYUDA_PUBLICO },
    { nombre: 'background_file', etiqueta: 'Imagen de fondo', tipo: 'archivo', acepta: IMAGENES },
    { nombre: 'background_url', etiqueta: 'Color de fondo', maximo: 500, ayuda: AYUDA_FONDO },
    { nombre: 'order', etiqueta: 'Orden', tipo: 'numero' },
    { nombre: 'active', etiqueta: 'Visible', tipo: 'interruptor' },
];

const aPayload = ({ background_url: fondo, ...resto }) => aFormData({
    ...resto,
    background_url: fondo?.startsWith('/static/') ? undefined : fondo,
});

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
    { title: 'Orden', dataIndex: 'order', width: 80 },
];

const DEFINICION = {
    recurso: 'carrusel',
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
