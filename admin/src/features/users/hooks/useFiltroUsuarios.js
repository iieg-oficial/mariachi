import { useMemo, useState } from 'react';
import { ROLE_LABEL } from '../constants/roles';

export const PAGE_SIZE = 12;
export const SIN_PROYECTOS = '__sin_proyectos__';

export const ORDEN_OPTIONS = [
    { value: 'nombre', label: 'Nombre (A-Z)' },
    { value: 'recientes', label: 'Alta más reciente' },
    { value: 'rol', label: 'Rol' },
];

const textoBuscable = (usuario) => [
    usuario.username,
    usuario.name,
    usuario.email,
    usuario.sieej_grupo?.nombre,
    ROLE_LABEL[usuario.role],
    ...(usuario.projects || []).map((p) => p.name),
].filter(Boolean).join(' ').toLowerCase();

const coincideProyecto = (usuario, proyecto) => {
    if (proyecto === SIN_PROYECTOS) {
        return usuario.role !== 'tetlamamakani' && (usuario.projects || []).length === 0;
    }
    if (usuario.role === 'tetlamamakani') return true;
    return (usuario.projects || []).some((p) => p.slug === proyecto);
};

const comparadores = {
    nombre: (a, b) => (a.name || '').localeCompare(b.name || '', 'es'),
    recientes: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    rol: (a, b) => (a.role || '').localeCompare(b.role || '', 'es')
        || (a.name || '').localeCompare(b.name || '', 'es'),
};

export default function useFiltroUsuarios(usuarios) {
    const [busqueda, setBusqueda] = useState('');
    const [rol, setRol] = useState('');
    const [proyecto, setProyecto] = useState('');
    const [orden, setOrden] = useState('nombre');
    const [pagina, setPagina] = useState(1);

    const conReinicio = (setter) => (valor) => {
        setter(valor);
        setPagina(1);
    };

    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return usuarios.filter((usuario) => {
            if (rol && usuario.role !== rol) return false;
            if (proyecto && !coincideProyecto(usuario, proyecto)) return false;
            if (!q) return true;
            return textoBuscable(usuario).includes(q);
        });
    }, [usuarios, busqueda, rol, proyecto]);

    const ordenados = useMemo(
        () => [...filtrados].sort(comparadores[orden] || comparadores.nombre),
        [filtrados, orden],
    );

    const totalPaginas = Math.max(1, Math.ceil(ordenados.length / PAGE_SIZE));
    const paginaActual = Math.min(pagina, totalPaginas);

    const visibles = useMemo(
        () => ordenados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE),
        [ordenados, paginaActual],
    );

    return {
        filtros: { busqueda, rol, proyecto, orden },
        setBusqueda: conReinicio(setBusqueda),
        setRol: conReinicio(setRol),
        setProyecto: conReinicio(setProyecto),
        setOrden: conReinicio(setOrden),
        pagina: paginaActual,
        setPagina,
        total: ordenados.length,
        visibles,
    };
}
