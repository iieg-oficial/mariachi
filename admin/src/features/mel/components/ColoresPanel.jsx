import { ColorPicker, Input, Space, Typography } from 'antd';
import {
    COLORES_VEREDICTO,
    esHex,
    explicaVeredicto,
    ratioContraste,
    veredicto,
} from '@features/mel/helpers/contraste';

const { Text } = Typography;

const FONDO_POR_DEFECTO = '#FFFFFF';

const Veredicto = ({ nivel, etiqueta, ancho }) => (
    <span
        style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '1px 7px',
            borderRadius: 4,
            width: ancho,
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
    seleccion,
    onSeleccionar,
    valorDeToken,
    onCambiar,
}) {
    const fondoReal = esHex(fondo) ? fondo : FONDO_POR_DEFECTO;
    const activo = tokens.find((token) => token.id === seleccion) || tokens[0];
    if (!activo) return null;

    const alTeclado = (id) => (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            onSeleccionar(id);
        }
    };

    const valorActivo = valorDeToken(activo);
    const veredictoActivo = veredicto(ratioContraste(valorActivo, fondoReal));

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
                {tokens.map((token) => {
                    const valor = valorDeToken(token);
                    const v = veredicto(ratioContraste(valor, fondoReal));
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
                                height: 32,
                                padding: '0 10px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                background: activa ? '#EAEFFA' : 'transparent',
                                boxShadow: activa ? 'inset 0 0 0 1px #2e4372' : 'none',
                            }}
                        >
                            <span
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 4,
                                    border: '1px solid rgba(0,0,0,0.12)',
                                    flexShrink: 0,
                                    background: esHex(valor) ? valor : 'transparent',
                                }}
                            />
                            <Text code style={{ fontSize: 12.5, width: 132 }}>{token.clave}</Text>
                            <Text type='secondary' style={{ fontSize: 12.5, width: 74 }}>{valor}</Text>
                            <Veredicto nivel={v.nivel} etiqueta={v.etiqueta} ancho={62} />
                            <Text
                                type='secondary'
                                style={{ flexGrow: 1, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                                {token.descripcion || '—'}
                            </Text>
                        </div>
                    );
                })}
            </div>

            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <Space align='center' style={{ width: '100%', marginBottom: 12 }}>
                    <span
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid rgba(0,0,0,0.12)',
                            display: 'inline-block',
                            background: esHex(valorActivo) ? valorActivo : 'transparent',
                        }}
                    />
                    <Text code strong>{activo.clave}</Text>
                </Space>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <ColorPicker
                        value={valorActivo}
                        onChangeComplete={(color) => onCambiar(activo, color.toHexString())}
                    />
                    <Input
                        value={valorActivo}
                        onChange={(evento) => onCambiar(activo, evento.target.value)}
                        style={{ width: 120 }}
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
                        background: veredictoActivo.nivel === 'aa' ? '#F6FBF8' : '#FFF7E6',
                        border: `1px solid ${veredictoActivo.nivel === 'aa' ? '#CDE7DA' : '#FFD591'}`,
                    }}
                >
                    <Veredicto nivel={veredictoActivo.nivel} etiqueta={veredictoActivo.etiqueta} />
                    <Text style={{ fontSize: 13 }}>{explicaVeredicto(veredictoActivo.nivel)}</Text>
                </div>
            </div>
        </>
    );
}
