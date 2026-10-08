import { ColorPicker, Input, Typography } from 'antd';
import {
    COLORES_VEREDICTO,
    esHex,
    esSuperficie,
    evaluarToken,
    explicaVeredicto,
} from '@features/mel/helpers/contraste';

const { Text } = Typography;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const ETIQUETA_GRUPO = {
    color: 'color de marca',
    tipografia: 'tipografía',
    espaciado: 'espaciado',
    radio: 'radio',
    sombra: 'sombra',
    breakpoint: 'breakpoint',
    dataviz: 'paleta de datos',
};

export default function EditorToken({ token, valor, onCambiar, fondo, colorTexto, ancho }) {
    if (!token) return null;

    const color = esHex(valor);
    const juicio = evaluarToken(token.clave, valor, fondo, colorTexto);
    const etiqueta = token.grupo === 'color' && esSuperficie(token.clave)
        ? 'superficie'
        : (ETIQUETA_GRUPO[token.grupo] || token.grupo);

    return (
        <div style={{ width: ancho || 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                {color && (
                    <span
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid rgba(0,0,0,0.15)',
                            flexShrink: 0,
                            display: 'inline-block',
                            background: valor,
                        }}
                    />
                )}
                <span
                    style={{
                        fontFamily: MONO,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {token.clave}
                </span>
                <span style={{ flexGrow: 1 }} />
                <Text type='secondary' style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{etiqueta}</Text>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: color ? 10 : 0 }}>
                {color && (
                    <ColorPicker
                        value={valor}
                        onChangeComplete={(elegido) => onCambiar(token, elegido.toHexString())}
                    />
                )}
                <Input
                    value={valor}
                    onChange={(evento) => onCambiar(token, evento.target.value)}
                    style={{ width: 130, fontFamily: MONO }}
                />
                <Input value={token.descripcion || ''} disabled style={{ flexGrow: 1 }} />
            </div>

            {color && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '8px 11px',
                        borderRadius: 8,
                        background: juicio.nivel === 'aa' ? '#F6FBF8' : '#FFF7E6',
                        border: `1px solid ${juicio.nivel === 'aa' ? '#CDE7DA' : '#FFD591'}`,
                    }}
                >
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '1px 8px',
                            borderRadius: 4,
                            flexShrink: 0,
                            background: COLORES_VEREDICTO[juicio.nivel].fondo,
                            color: COLORES_VEREDICTO[juicio.nivel].texto,
                        }}
                    >
                        {juicio.etiqueta}
                    </span>
                    <Text style={{ fontSize: 13 }}>{explicaVeredicto(juicio.nivel, juicio.contra)}</Text>
                </div>
            )}
        </div>
    );
}
