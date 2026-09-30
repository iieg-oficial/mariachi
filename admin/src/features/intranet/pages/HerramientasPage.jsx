import { AppstoreOutlined } from '@ant-design/icons';

import PaginaRecurso from '../components/PaginaRecurso';
import { ICONOS_HERRAMIENTA } from '../constants/campos';

const AYUDA_URL = 'Dirección completa de la herramienta dentro de la red del instituto, con https:// o http://.';

const DEFINICION = {
    recurso: 'herramientas',
    singular: 'Herramienta',
    titulo: 'Herramientas',
    descripcion: 'Servicios de código abierto que corren en el instituto. La intranet muestra una tarjeta por cada uno.',
    alta: 'Nueva herramienta',
    vacio: 'Todavía no hay herramientas en el catálogo',
    icono: <AppstoreOutlined />,
    columnas: [
        { title: 'Nombre', dataIndex: 'nombre' },
        { title: 'Descripción', dataIndex: 'descripcion' },
        { title: 'URL', dataIndex: 'url' },
        { title: 'Visible', dataIndex: 'activa', width: 90, render: (activa) => (activa ? 'Sí' : 'No') },
        { title: 'Orden', dataIndex: 'orden', width: 80 },
    ],
    campos: [
        { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, maximo: 100 },
        { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto-largo', requerido: true, maximo: 300 },
        { nombre: 'url', etiqueta: 'URL', requerido: true, maximo: 500, ayuda: AYUDA_URL },
        { nombre: 'icono', etiqueta: 'Icono', tipo: 'opciones', opciones: ICONOS_HERRAMIENTA, requerido: true },
        { nombre: 'orden', etiqueta: 'Orden', tipo: 'numero' },
        { nombre: 'activa', etiqueta: 'Visible', tipo: 'interruptor' },
    ],
    aPayload: (valores) => ({ ...valores, orden: valores.orden ?? 0, activa: valores.activa ?? true }),
};

const HerramientasPage = () => <PaginaRecurso definicion={DEFINICION} />;

export default HerramientasPage;
