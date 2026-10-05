import { useEffect, useMemo, useState } from 'react';
import { Segmented } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';

import PaginaRecurso from '../components/PaginaRecurso';
import { listar } from '../api/intranetService';

const VISTAS = [
    { label: 'Sitios', value: 'sitios' },
    { label: 'Categorías', value: 'categorias' },
];

const AYUDA_PROYECTO = 'Una línea para la página de Proyectos de la intranet: qué es y para quién.';

const AYUDA_LOGO = 'URL del logo en el Acervo (SVG de preferencia). Vacía muestra las iniciales.';

const AYUDA_SLUG = 'Nombre del servicio en huachicol. De ahí sale el estado que muestra la intranet.';

const limpiar = (valores) => Object.fromEntries(
    Object.entries(valores).map(([clave, valor]) => [clave, valor === '' ? null : valor]),
);

const CATEGORIAS = {
    recurso: 'categorias',
    singular: 'Categoría',
    titulo: 'Sitios monitoreados',
    descripcion: 'Grupos en los que se ordenan las tarjetas de estado de la intranet.',
    alta: 'Nueva categoría',
    vacio: 'Todavía no hay categorías',
    icono: <CloudServerOutlined />,
    columnas: [{ title: 'Nombre', dataIndex: 'nombre' }],
    campos: [{
        nombre: 'nombre', etiqueta: 'Nombre', requerido: true, maximo: 100,
        ayuda: 'Entre 8 y 100 caracteres.',
    }],
};

const definicionDeSitios = (categorias) => {
    const nombres = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));
    return {
        recurso: 'sitios',
        ordenable: { campo: 'orden' },
        singular: 'Sitio',
        titulo: 'Sitios monitoreados',
        descripcion: 'Los proyectos del IIEG que muestra la intranet, con su estado y sus enlaces a Taiga, GitLab y GitHub.',
        alta: 'Nuevo sitio',
        vacio: 'Todavía no hay sitios',
        icono: <CloudServerOutlined />,
        aPayload: limpiar,
        columnas: [
            { title: 'Nombre', dataIndex: 'name' },
            { title: 'URL', dataIndex: 'url' },
            { title: 'Categoría', dataIndex: 'category_id', render: (id) => nombres[id] },
            { title: 'Huachicol', dataIndex: 'huachicol_slug', width: 140 },
        ],
        campos: [
            { nombre: 'name', etiqueta: 'Nombre', requerido: true, maximo: 200 },
            { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto-largo', maximo: 300, ayuda: AYUDA_PROYECTO },
            { nombre: 'url', etiqueta: 'URL', requerido: true, maximo: 500 },
            { nombre: 'logo_url', etiqueta: 'Logo', maximo: 500, ayuda: AYUDA_LOGO },
            {
                nombre: 'category_id', etiqueta: 'Categoría', tipo: 'opciones', requerido: true,
                opciones: categorias.map((c) => ({ value: c.id, label: c.nombre })),
            },
            { nombre: 'huachicol_slug', etiqueta: 'Servicio en huachicol', maximo: 100, ayuda: AYUDA_SLUG },
            { nombre: 'taiga_url', etiqueta: 'Taiga', maximo: 500 },
            { nombre: 'gitlab_url', etiqueta: 'GitLab', maximo: 500 },
            { nombre: 'github_url', etiqueta: 'GitHub', maximo: 500 },
            { nombre: 'orden', etiqueta: 'Orden', tipo: 'numero', ayuda: 'Posición en la intranet, de menor a mayor.' },
        ],
    };
};

const SitiosPage = () => {
    const [vista, setVista] = useState('sitios');
    const [categorias, setCategorias] = useState([]);

    useEffect(() => {
        let vigente = true;
        listar('categorias')
            .then((lista) => { if (vigente) setCategorias(lista); })
            .catch(() => { if (vigente) setCategorias([]); });
        return () => { vigente = false; };
    }, [vista]);

    const sitios = useMemo(() => definicionDeSitios(categorias), [categorias]);
    const selector = <Segmented options={VISTAS} value={vista} onChange={setVista} />;

    return (
        <PaginaRecurso
            key={vista}
            definicion={vista === 'sitios' ? sitios : CATEGORIAS}
            extra={selector}
        />
    );
};

export default SitiosPage;
