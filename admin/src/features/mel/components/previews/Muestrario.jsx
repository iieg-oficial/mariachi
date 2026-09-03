import { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import {
    COLORES_VEREDICTO,
    esHex,
    evaluarToken,
} from '@features/mel/helpers/contraste';

const { Text } = Typography;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const GRUPOS_ESPACIO = ['espaciado', 'radio'];

const aPx = (valor) => {
    const texto = String(valor ?? '').trim();
    if (texto.endsWith('rem')) return Math.round(parseFloat(texto) * 16);
    if (texto.endsWith('px')) return Math.round(parseFloat(texto));
    return null;
};

const marco = (activo) => ({
    borderRadius: 8,
    border: `1px solid ${activo ? '#2e4372' : '#f0f0f0'}`,
    boxShadow: activo ? '0 0 0 3px #EAEFFA' : 'none',
    transition: 'box-shadow 0.15s, border-color 0.15s',
});

const Titulo = ({ children }) => (
    <Text
        strong
        style={{
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#5C2472',
            display: 'block',
            marginBottom: 12,
        }}
    >
        {children}
    </Text>
);

export default function Muestrario({ tokens, seleccion, onSeleccionar, fondo, colorTexto }) {
    const refs = useRef({});

    useEffect(() => {
        const nodo = refs.current[seleccion];
        if (nodo) nodo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [seleccion]);

    const de = (grupos) => tokens.filter((token) => grupos.includes(token.grupo));
    const colores = de(['color']);
    const tamanos = de(['tipografia']).filter((token) => token.clave.startsWith('font.size.'));
    const familias = de(['tipografia']).filter((token) => token.clave.startsWith('font.family.'));
    const espacios = de(GRUPOS_ESPACIO);

    const registrar = (id) => (nodo) => { refs.current[id] = nodo; };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
                <Titulo>Colores</Titulo>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
                    {colores.map((token) => {
                        const juicio = evaluarToken(token.clave, token.valor, fondo, colorTexto);
                        const activo = token.id === seleccion;
                        return (
                            <button
                                key={token.id}
                                type='button'
                                ref={registrar(token.id)}
                                onClick={() => onSeleccionar(token.id)}
                                style={{
                                    ...marco(activo),
                                    padding: 0,
                                    overflow: 'hidden',
                                    background: '#fff',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    font: 'inherit',
                                }}
                            >
                                <div style={{ height: 52, background: esHex(token.valor) ? token.valor : '#fafafa' }} />
                                <div style={{ padding: '8px 10px' }}>
                                    <div style={{ fontFamily: MONO, fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {token.clave.replace('color.', '')}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                        <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                                            {token.valor}
                                        </span>
                                        <span style={{ flexGrow: 1 }} />
                                        <span
                                            style={{
                                                fontSize: 10.5,
                                                fontWeight: 600,
                                                padding: '0 5px',
                                                borderRadius: 4,
                                                background: COLORES_VEREDICTO[juicio.nivel].fondo,
                                                color: COLORES_VEREDICTO[juicio.nivel].texto,
                                            }}
                                        >
                                            {juicio.etiqueta}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <Titulo>Tipografía</Titulo>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {familias.map((token) => {
                        const activo = token.id === seleccion;
                        return (
                            <button
                                key={token.id}
                                type='button'
                                ref={registrar(token.id)}
                                onClick={() => onSeleccionar(token.id)}
                                style={{
                                    ...marco(activo),
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14,
                                    padding: '9px 12px',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    font: 'inherit',
                                    textAlign: 'left',
                                }}
                            >
                                <span style={{ fontFamily: MONO, fontSize: 11.5, width: 148, flexShrink: 0, color: 'rgba(0,0,0,0.45)' }}>
                                    {token.clave}
                                </span>
                                <span style={{ fontFamily: String(token.valor), fontSize: 18 }}>
                                    Jalisco en cifras
                                </span>
                            </button>
                        );
                    })}
                    {tamanos.map((token) => {
                        const px = aPx(token.valor);
                        const activo = token.id === seleccion;
                        return (
                            <button
                                key={token.id}
                                type='button'
                                ref={registrar(token.id)}
                                onClick={() => onSeleccionar(token.id)}
                                style={{
                                    ...marco(activo),
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: 14,
                                    padding: '7px 12px',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    font: 'inherit',
                                    textAlign: 'left',
                                }}
                            >
                                <span style={{ fontFamily: MONO, fontSize: 11.5, width: 148, flexShrink: 0, color: 'rgba(0,0,0,0.45)' }}>
                                    {token.clave}
                                </span>
                                <span style={{ fontFamily: MONO, fontSize: 11.5, width: 62, flexShrink: 0, color: 'rgba(0,0,0,0.45)' }}>
                                    {token.valor}
                                </span>
                                <span style={{ fontSize: px ? Math.min(px, 34) : 14, lineHeight: 1.25, whiteSpace: 'nowrap' }}>
                                    Jalisco en cifras
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <Titulo>Espacio y forma</Titulo>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {espacios.map((token) => {
                        const px = aPx(token.valor);
                        const activo = token.id === seleccion;
                        const esRadio = token.grupo === 'radio';
                        return (
                            <button
                                key={token.id}
                                type='button'
                                ref={registrar(token.id)}
                                onClick={() => onSeleccionar(token.id)}
                                style={{
                                    ...marco(activo),
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14,
                                    padding: '6px 12px',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    font: 'inherit',
                                    textAlign: 'left',
                                }}
                            >
                                <span style={{ fontFamily: MONO, fontSize: 11.5, width: 148, flexShrink: 0, color: 'rgba(0,0,0,0.45)' }}>
                                    {token.clave}
                                </span>
                                <span style={{ fontFamily: MONO, fontSize: 11.5, width: 62, flexShrink: 0, color: 'rgba(0,0,0,0.45)' }}>
                                    {token.valor}
                                </span>
                                {esRadio ? (
                                    <span
                                        style={{
                                            width: 42,
                                            height: 24,
                                            background: '#EAEFFA',
                                            border: '1px solid #2e4372',
                                            borderRadius: Math.min(px ?? 0, 12),
                                            flexShrink: 0,
                                        }}
                                    />
                                ) : (
                                    <span
                                        style={{
                                            height: 12,
                                            borderRadius: 3,
                                            background: '#5C2472',
                                            width: Math.min(px ?? 0, 320),
                                            flexShrink: 0,
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
