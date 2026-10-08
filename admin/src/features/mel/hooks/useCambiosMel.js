import { useCallback, useMemo, useState } from 'react';
import { updateCampos, updateToken } from '@features/mel/api/melService';

const comoTexto = (valor) => (Array.isArray(valor) ? valor.join(', ') : String(valor ?? ''));

const aValorDeToken = (token, crudo) => (
    Array.isArray(token.valor)
        ? crudo.split(',').map((parte) => parte.trim()).filter(Boolean)
        : crudo
);

export default function useCambiosMel(detalle, onGuardado) {
    const [tokens, setTokens] = useState({});
    const [campos, setCampos] = useState({});
    const [guardando, setGuardando] = useState(false);

    const valorDeToken = useCallback(
        (token) => (token.id in tokens ? tokens[token.id] : comoTexto(token.valor)),
        [tokens],
    );

    const valorDeCampo = useCallback(
        (clave, actual) => (clave in campos ? campos[clave] : (actual ?? '')),
        [campos],
    );

    const cambiarToken = useCallback((token, valor) => {
        setTokens((previo) => {
            const siguiente = { ...previo };
            if (comoTexto(token.valor) === valor) delete siguiente[token.id];
            else siguiente[token.id] = valor;
            return siguiente;
        });
    }, []);

    const cambiarCampo = useCallback((clave, valor, actual) => {
        setCampos((previo) => {
            const siguiente = { ...previo };
            if ((actual ?? '') === valor) delete siguiente[clave];
            else siguiente[clave] = valor;
            return siguiente;
        });
    }, []);

    const descartar = useCallback(() => {
        setTokens({});
        setCampos({});
    }, []);

    const lista = useMemo(() => {
        if (!detalle) return [];
        const porId = new Map((detalle.tokens || []).map((token) => [token.id, token]));
        const deTokens = Object.entries(tokens).map(([id, despues]) => {
            const token = porId.get(Number(id));
            return {
                id: `token-${id}`,
                clave: token ? token.clave : id,
                grupo: token ? token.grupo : '',
                antes: token ? comoTexto(token.valor) : '',
                despues,
            };
        });
        const deCampos = Object.entries(campos).map(([clave, despues]) => ({
            id: `campo-${clave}`,
            clave,
            grupo: 'guia',
            antes: (detalle.campos || {})[clave] || '',
            despues,
        }));
        return [...deTokens, ...deCampos];
    }, [detalle, tokens, campos]);

    const guardar = useCallback(async () => {
        if (!detalle) return;
        setGuardando(true);
        try {
            const porId = new Map((detalle.tokens || []).map((token) => [token.id, token]));
            const entradas = Object.entries(tokens);
            for (const [id, crudo] of entradas) {
                const token = porId.get(Number(id));
                if (!token) continue;
                await updateToken(detalle.marca.codigo, token.id, {
                    valor: aValorDeToken(token, crudo),
                });
            }
            if (Object.keys(campos).length > 0) {
                await updateCampos(detalle.marca.codigo, campos);
            }
            descartar();
            await onGuardado();
        } finally {
            setGuardando(false);
        }
    }, [detalle, tokens, campos, descartar, onGuardado]);

    return {
        valorDeToken,
        valorDeCampo,
        cambiarToken,
        cambiarCampo,
        descartar,
        guardar,
        guardando,
        lista,
        total: lista.length,
    };
}
