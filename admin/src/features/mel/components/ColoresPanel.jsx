import { ColorPicker, Input, Tooltip, Typography } from 'antd';
import {
    COLORES_VEREDICTO,
    esHex,
    esSuperficie,
    evaluarToken,
    explicaVeredicto,
} from '@features/mel/helpers/contraste';

const { Text } = Typography;

const FONDO_POR_DEFECTO = '#FFFFFF';
const TEXTO_POR_DEFECTO = '#000000';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const recorte = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const Muestra = ({ valor, lado }) => (
    <span
        style={{
            width: lado,
            height: lado,
            borderRadius: lado > 20 ? 8 : 4,
            border: '1px solid rgba(0,0,0,0.15)',
            flexShrink: 0,
            display: 'inline-block',
            background: esHex(valor) ? valor : 'transparent',
        }}
    />
);

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
}) {
    const fondoReal = esHex(fondo) ? fondo : FONDO_POR_DEFECTO;
    const textoReal = esHex(colorTexto) ? colorTexto : TEXTO_POR_DEFECTO;
    const activo = tokens.find((token) => token.id === seleccion) || tokens[0];
    if (!activo) return null;

    const alTeclado = (id) => (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            onSeleccionar(id);
        }
    };

    const valorActivo = valorDeToken(activo);
    const juicioActivo = evaluarToken(activo.clave, valorActivo, fondoReal, textoReal);

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
                {tokens.map((token) => {
                    const valor = valorDeToken(token);
                    const juicio = evaluarToken(token.clave, valor, fondoReal, textoReal);
                    const activa = token.id === activo.id;
                    return (
                        <div
                            key={token.id}
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
                                background: activa ? '#EAEFFA' : 'transparent',
                                boxShadow: activa ? 'inset 0 0 0 1px #2e4372' : 'none',
                            }}
                        >
                            <Muestra valor={valor} lado={18} />
                            <span
                                style={{
                                    fontFamily: MONO,
                                    fontSize: 12,
                                    width: 172,
                                    flexShrink: 0,
                                    ...recorte,
                                }}
                                title={token.clave}
                            >
                                {token.clave}
                            </span>
                            <span
                                style={{
                                    fontFamily: MONO,
                                    fontSize: 12,
                                    width: 72,
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
                            <Tooltip
                                title={token.descripcion}
                                trigger={['hover', 'focus', 'click']}
                                placement='topLeft'
                                styles={{ root: { maxWidth: 420 } }}
                            >
                                <button
                                    type='button'
                                    style={{
                                        flexGrow: 1,
                                        minWidth: 0,
                                        fontSize: 13,
                                        color: 'rgba(0,0,0,0.45)',
                                        cursor: token.descripcion ? 'help' : 'default',
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        textAlign: 'left',
                                        font: 'inherit',
                                        ...recorte,
                                    }}
                                >
                                    {token.descripcion || '—'}
                                </button>
                            </Tooltip>
                        </div>
                    );
                })}
            </div>

            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Muestra valor={valorActivo} lado={32} />
                    <span style={{ fontFamily: MONO, fontWeight: 600, ...recorte }}>{activo.clave}</span>
                    <span style={{ flexGrow: 1 }} />
                    <Text type='secondary' style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {esSuperficie(activo.clave) ? 'superficie' : 'color de marca'}
                    </Text>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <ColorPicker
                        value={valorActivo}
                        onChangeComplete={(color) => onCambiar(activo, color.toHexString())}
                    />
                    <Input
                        value={valorActivo}
                        onChange={(evento) => onCambiar(activo, evento.target.value)}
                        style={{ width: 120, fontFamily: MONO }}
                    />
                    <Input value={activo.descripcion || ''} disabled style={{ flexGrow: 1 }} />
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '8px 11px',
                        borderRadius: 8,
                        background: juicioActivo.nivel === 'aa' ? '#F6FBF8' : '#FFF7E6',
                        border: `1px solid ${juicioActivo.nivel === 'aa' ? '#CDE7DA' : '#FFD591'}`,
                    }}
                >
                    <Veredicto nivel={juicioActivo.nivel} etiqueta={juicioActivo.etiqueta} />
                    <Text style={{ fontSize: 13 }}>
                        {explicaVeredicto(juicioActivo.nivel, juicioActivo.contra)}
                    </Text>
                </div>
            </div>
        </>
    );
}
