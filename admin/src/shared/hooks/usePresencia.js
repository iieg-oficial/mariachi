import { useEffect, useRef, useState } from 'react';
import api from '@shared/services/api';

export default function usePresencia(basePath, enabled = true) {
    const [editores, setEditores] = useState([]);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!enabled || !basePath) return undefined;

        const registrar = async () => {
            try { await api.put(`${basePath}/presencia`); } catch { /* silencioso */ }
        };
        const obtener = async () => {
            try {
                const { data } = await api.get(`${basePath}/presencia`);
                setEditores(Array.isArray(data) ? data : []);
            } catch { /* silencioso */ }
        };

        registrar();
        obtener();
        intervalRef.current = setInterval(() => { registrar(); obtener(); }, 20000);
        return () => clearInterval(intervalRef.current);
    }, [basePath, enabled]);

    return editores;
}
