import { PictureOutlined } from '@ant-design/icons';

import Miniatura from '../components/Miniatura';
import PaginaRecurso from '../components/PaginaRecurso';
import { aFormData } from '../api/intranetService';
import { AYUDA_PUBLICO, IMAGENES } from '../constants/campos';

const DEFINICION = {
    recurso: 'galeria',
    singular: 'Imagen',
    titulo: 'Galería',
    descripcion: 'Fotografías de la portada de la intranet. Hasta 5 MB por imagen.',
    alta: 'Nueva imagen',
    vacio: 'Todavía no hay imágenes en la galería',
    icono: <PictureOutlined />,
    editable: false,
    aPayload: aFormData,
    columnas: [
        {
            title: 'Imagen', dataIndex: 'image_path', width: 90,
            render: (ruta, fila) => <Miniatura ruta={ruta} alt={fila.title} />,
        },
        { title: 'Título', dataIndex: 'title' },
        { title: 'Orden', dataIndex: 'order', width: 80 },
    ],
    campos: [
        { nombre: 'title', etiqueta: 'Título', requerido: true, maximo: 150 },
        {
            nombre: 'file', etiqueta: 'Imagen', tipo: 'archivo', requerido: true,
            acepta: IMAGENES, ayuda: AYUDA_PUBLICO,
        },
        { nombre: 'order', etiqueta: 'Orden', tipo: 'numero' },
    ],
};

const GaleriaPage = () => <PaginaRecurso definicion={DEFINICION} />;

export default GaleriaPage;
