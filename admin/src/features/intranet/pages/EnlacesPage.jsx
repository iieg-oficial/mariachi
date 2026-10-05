import { LinkOutlined } from '@ant-design/icons';

import PaginaRecurso from '../components/PaginaRecurso';
import { ICONOS_ENLACE } from '../constants/campos';

const AYUDA_URL = 'Empieza con https://, http://, mailto:, tel: o /. Vacía deja el renglón como texto.';

const DEFINICION = {
    recurso: 'enlaces',
    ordenable: { campo: 'orden', grupo: 'seccion' },
    singular: 'Enlace',
    titulo: 'Pie de página',
    descripcion: 'Enlaces y datos de contacto del pie de la intranet, agrupados por sección.',
    alta: 'Nuevo enlace',
    vacio: 'Todavía no hay enlaces en el pie de página',
    icono: <LinkOutlined />,
    columnas: [
        { title: 'Sección', dataIndex: 'seccion', width: 160 },
        { title: 'Etiqueta', dataIndex: 'etiqueta' },
        { title: 'URL', dataIndex: 'url' },
        { title: 'Icono', dataIndex: 'icono', width: 110 },
    ],
    campos: [
        { nombre: 'seccion', etiqueta: 'Sección', requerido: true, maximo: 100 },
        { nombre: 'etiqueta', etiqueta: 'Etiqueta', requerido: true, maximo: 200 },
        { nombre: 'url', etiqueta: 'URL', maximo: 500, ayuda: AYUDA_URL },
        { nombre: 'icono', etiqueta: 'Icono', tipo: 'opciones', opciones: ICONOS_ENLACE, requerido: true },
        { nombre: 'orden', etiqueta: 'Orden', tipo: 'numero' },
    ],
    aPayload: (valores) => ({ ...valores, url: valores.url || null, orden: valores.orden ?? 0 }),
};

const EnlacesPage = () => <PaginaRecurso definicion={DEFINICION} />;

export default EnlacesPage;
