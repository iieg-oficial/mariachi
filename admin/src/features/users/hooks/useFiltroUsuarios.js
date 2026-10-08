import { useCallback, useMemo, useState } from 'react';
import { ROLE_LABEL } from '../constants/roles';

export const BLOQUE = 30;
export const SIN_PROYECTOS = '__sin_proyectos__';

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

const porNombre = (a, b) => (a.name || '').localeCompare(b.name || '', 'es');

export default function useFiltroUsuarios(usuarios) {
    const [busqueda, setBusqueda] = useState('');
    const [rol, setRol] = useState('');
    const [proyecto, setProyecto] = useState('');
    const [mostrados, setMostrados] = useState(BLOQUE);

    const conReinicio = (setter) => (valor) => {
        setter(valor);
        setMostrados(BLOQUE);
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

    const ordenados = useMemo(() => [...filtrados].sort(porNombre), [filtrados]);

    const ventana = Math.min(mostrados, ordenados.length);

    const visibles = useMemo(() => ordenados.slice(0, ventana), [ordenados, ventana]);

    const verMas = useCallback(() => setMostrados((n) => n + BLOQUE), []);

    return {
        filtros: { busqueda, rol, proyecto },
        setBusqueda: conReinicio(setBusqueda),
        setRol: conReinicio(setRol),
        setProyecto: conReinicio(setProyecto),
        total: ordenados.length,
        visibles,
        hayMas: ventana < ordenados.length,
        verMas,
    };
}
