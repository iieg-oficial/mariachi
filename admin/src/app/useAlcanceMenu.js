import { useState } from 'react';
import { ALCANCE_EN_LINEA, ALCANCE_LOCAL, MENU_LOCAL_DISPONIBLE } from '@app/sider-alcance';
import { alcanceDePath } from '@app/sider-config';

const STORAGE_KEY = 'mariachi.sider.alcance';
const VALIDOS = [ALCANCE_EN_LINEA, ALCANCE_LOCAL];

const leerGuardado = () => {
    try {
        const guardado = localStorage.getItem(STORAGE_KEY);
        return VALIDOS.includes(guardado) ? guardado : null;
    } catch {
        return null;
    }
};

const guardar = (alcance) => {
    try {
        localStorage.setItem(STORAGE_KEY, alcance);
    } catch {
        return;
    }
};

export function useAlcanceMenu(pathname) {
    const [elegido, setElegido] = useState(() => alcanceDePath(pathname) || leerGuardado() || ALCANCE_EN_LINEA);
    const [pathVisto, setPathVisto] = useState(pathname);

    if (pathVisto !== pathname) {
        setPathVisto(pathname);
        const delPath = alcanceDePath(pathname);
        if (delPath && delPath !== elegido) setElegido(delPath);
    }

    const elegir = (alcance) => {
        if (!VALIDOS.includes(alcance)) return;
        setElegido(alcance);
        guardar(alcance);
    };

    return {
        disponible: MENU_LOCAL_DISPONIBLE,
        alcance: MENU_LOCAL_DISPONIBLE ? elegido : ALCANCE_EN_LINEA,
        elegir,
    };
}
