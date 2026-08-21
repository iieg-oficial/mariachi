import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@shared/services/api';
import { message } from '@shared/services/message';

const FETCH_LIMIT = 500;
const MAX_PAGINAS = 20;

export const fetchUsuarios = async () => {
    const acumulado = [];
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
        const { data } = await api.get('/usuarios', {
            params: { skip: pagina * FETCH_LIMIT, limit: FETCH_LIMIT },
        });
        acumulado.push(...data);
        if (data.length < FETCH_LIMIT) break;
    }
    return acumulado;
};

export default function useUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [proyectos, setProyectos] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const gruposPedidos = useRef(false);

    const recargar = useCallback(async () => {
        try {
            setUsuarios(await fetchUsuarios());
        } catch {
            message.error('Error al cargar usuarios');
        }
    }, []);

    useEffect(() => {
        let cancelado = false;
        Promise.all([fetchUsuarios(), api.get('/projects')])
            .then(([listaUsuarios, proyectosRes]) => {
                if (cancelado) return;
                setUsuarios(listaUsuarios);
                setProyectos(proyectosRes.data);
            })
            .catch(() => message.error('Error al cargar datos'))
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, []);

    const cargarGrupos = useCallback(async () => {
        if (gruposPedidos.current) return;
        gruposPedidos.current = true;
        try {
            const { data } = await api.get('/sieej/grupos');
            setGrupos(data);
        } catch {
            gruposPedidos.current = false;
            message.warning('No se pudieron cargar las dependencias de SIEEJ');
        }
    }, []);

    return { usuarios, proyectos, grupos, cargando, recargar, cargarGrupos };
}
