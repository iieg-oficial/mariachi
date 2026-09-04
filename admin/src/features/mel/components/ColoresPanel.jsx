import { Popover, Tooltip } from 'antd';
import {
    COLORES_VEREDICTO,
    esHex,
    evaluarToken,
} from '@features/mel/helpers/contraste';
import { tocaElemento } from '@features/mel/helpers/aplicacion';
import EditorToken from '@features/mel/components/EditorToken';

const FONDO_POR_DEFECTO = '#FFFFFF';
const TEXTO_POR_DEFECTO = '#000000';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const recorte = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const Veredicto = ({ nivel, etiqueta }) => (
    <span
        style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '1px 7px',
            borderRadius: 4,
            width: 62,
            textAlign: 'center',
            flexShrink: 0,
            background: COLORES_VEREDICTO[nivel].fondo,
            color: COLORES_VEREDICTO[nivel].texto,
        }}
    >
        {etiqueta}
    </span>
);

export default function ColoresPanel({
    tokens,
    fondo,
    colorTexto,
    seleccion,
    onSeleccionar,
    valorDeToken,
    onCambiar,
    elemento,
    ancla,
    onCerrarAncla,
}) {
    const fondoReal = esHex(fondo) ? fondo : FONDO_POR_DEFECTO;
    const textoReal = esHex(colorTexto) ? colorTexto : TEXTO_POR_DEFECTO;

    const alTeclado = (id) => (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            onSeleccionar(id);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
            {tokens.map((token) => {
                const valor = valorDeToken(token);
                const juicio = evaluarToken(token.clave, valor, fondoReal, textoReal);
                const activa = token.id === seleccion;
                const relacionada = tocaElemento(token.clave, valor, elemento);
                const fila = (
                    <div
                        role='button'
                        tabIndex={0}
                        onClick={() => onSeleccionar(token.id)}
                        onKeyDown={alTeclado(token.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            height: 34,
                            padding: '0 10px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: activa ? '#EAEFFA' : (relacionada ? '#F6F8FD' : 'transparent'),
                            boxShadow: activa ? 'inset 0 0 0 1px #2e4372' : 'none',
                        }}
                    >
                        <span
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                border: '1px solid rgba(0,0,0,0.15)',
                                flexShrink: 0,
                                display: 'inline-block',
                                background: esHex(valor) ? valor : 'transparent',
                            }}
                        />
                        <Tooltip
                            title={token.descripcion}
                            placement='topLeft'
                            styles={{ root: { maxWidth: 420 } }}
                        >
                            <span
                                style={{
                                    fontFamily: MONO,
                                    fontSize: 12.5,
                                    flexGrow: 1,
                                    minWidth: 0,
                                    fontWeight: relacionada ? 600 : 400,
                                    color: relacionada ? '#2e4372' : 'inherit',
                                    ...recorte,
                                }}
                            >
                                {token.clave}
                            </span>
                        </Tooltip>
                        <span
                            style={{
                                fontFamily: MONO,
                                fontSize: 12,
                                width: 76,
                                flexShrink: 0,
                                color: 'rgba(0,0,0,0.45)',
                                ...recorte,
                            }}
                        >
                            {valor}
                        </span>
                        <Tooltip title={juicio.contra}>
                            <Veredicto nivel={juicio.nivel} etiqueta={juicio.etiqueta} />
                        </Tooltip>
                    </div>
                );

                if (ancla !== token.id) return <div key={token.id}>{fila}</div>;

                return (
                    <Popover
                        key={token.id}
                        open
                        trigger='click'
                        placement='rightTop'
                        onOpenChange={(abierto) => { if (!abierto) onCerrarAncla(); }}
                        content={(
                            <EditorToken
                                token={token}
                                valor={valor}
                                onCambiar={onCambiar}
                                fondo={fondoReal}
                                colorTexto={textoReal}
                                ancho={380}
                            />
                        )}
                    >
                        {fila}
                    </Popover>
                );
            })}
        </div>
    );
}
