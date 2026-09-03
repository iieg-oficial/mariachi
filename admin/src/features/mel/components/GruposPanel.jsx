import { Collapse, Input, Tag, Typography } from 'antd';
import CamposPanel from '@features/mel/components/CamposPanel';
import { esHex } from '@features/mel/helpers/contraste';

const { Text } = Typography;

const GRUPOS_ESPACIO = ['espaciado', 'radio', 'sombra', 'breakpoint'];

const aPx = (valor) => {
    const texto = String(valor ?? '').trim();
    if (texto.endsWith('rem')) return Math.round(parseFloat(texto) * 16);
    if (texto.endsWith('px')) return Math.round(parseFloat(texto));
    return null;
};

const Muestra = ({ grupo, valor }) => {
    if (grupo === 'tipografia') {
        const px = aPx(valor);
        if (!px) return <Text style={{ fontSize: 13 }}>{valor}</Text>;
        return (
            <span style={{ fontSize: Math.min(px, 30), lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                Jalisco en cifras
            </span>
        );
    }
    if (grupo === 'dataviz' && esHex(valor)) {
        return (
            <span
                style={{
                    height: 16,
                    borderRadius: 4,
                    flexGrow: 1,
                    maxWidth: 180,
                    background: valor,
                    border: '1px solid rgba(0,0,0,0.08)',
                }}
            />
        );
    }
    const px = aPx(valor);
    if (px !== null) {
        return (
            <span
                style={{
                    height: 10,
                    borderRadius: 3,
                    background: '#5C2472',
                    flexShrink: 0,
                    width: Math.min(px, 260),
                }}
            />
        );
    }
    return <Text type='secondary' style={{ fontSize: 13 }}>{valor}</Text>;
};

const FilasTokens = ({ tokens, valorDeToken, onCambiar, seleccion, onSeleccionar }) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tokens.map((token) => {
            const valor = valorDeToken(token);
            const activo = token.id === seleccion;
            return (
                <div
                    key={token.id}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '6px 8px',
                        borderRadius: 8,
                        borderBottom: '1px solid #f5f5f5',
                        background: activo ? '#EAEFFA' : 'transparent',
                        boxShadow: activo ? 'inset 0 0 0 1px #2e4372' : 'none',
                    }}
                >
                    <button
                        type='button'
                        onClick={() => onSeleccionar(token.id)}
                        style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontSize: 12,
                            width: 152,
                            flexShrink: 0,
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'inherit',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                        title={token.clave}
                    >
                        {token.clave}
                    </button>
                    <Input
                        size='small'
                        value={valor}
                        onChange={(evento) => onCambiar(token, evento.target.value)}
                        style={{ width: 128, flexShrink: 0 }}
                    />
                    <Muestra grupo={token.grupo} valor={valor} />
                </div>
            );
        })}
    </div>
);

export default function GruposPanel({
    tokens,
    campos,
    abierto,
    onAbrir,
    valorDeToken,
    onCambiarToken,
    valorDeCampo,
    onCambiarCampo,
    sinDefinir,
    seleccion,
    onSeleccionar,
}) {
    const de = (grupos) => tokens.filter((token) => grupos.includes(token.grupo));
    const tipografia = de(['tipografia']);
    const espacio = de(GRUPOS_ESPACIO);
    const dataviz = de(['dataviz']);

    const cabecera = (nombre, cantidad, nota) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <Text strong>{nombre}</Text>
            <Tag>{cantidad}</Tag>
            <span style={{ flexGrow: 1 }} />
            <Text type='secondary' style={{ fontSize: 13 }}>{nota}</Text>
        </div>
    );

    const items = [
        {
            key: 'tipografia',
            label: cabecera('Tipografía', tipografia.length, 'familias, tamaños y pesos'),
            children: (
                <FilasTokens tokens={tipografia} valorDeToken={valorDeToken} onCambiar={onCambiarToken} seleccion={seleccion} onSeleccionar={onSeleccionar} />
            ),
        },
        {
            key: 'espacio',
            label: cabecera('Espacio y forma', espacio.length, 'espaciado, radios, sombras y breakpoints'),
            children: (
                <FilasTokens tokens={espacio} valorDeToken={valorDeToken} onCambiar={onCambiarToken} seleccion={seleccion} onSeleccionar={onSeleccionar} />
            ),
        },
        {
            key: 'dataviz',
            label: cabecera('Dataviz', dataviz.length, 'paletas de visualización'),
            children: (
                <FilasTokens tokens={dataviz} valorDeToken={valorDeToken} onCambiar={onCambiarToken} seleccion={seleccion} onSeleccionar={onSeleccionar} />
            ),
        },
        {
            key: 'guia',
            label: cabecera('Guía de marca', Object.keys(campos).length, sinDefinir > 0 ? `${sinDefinir} sin definir` : 'completa'),
            children: (
                <CamposPanel
                    campos={campos}
                    valorDeCampo={valorDeCampo}
                    onCambiar={onCambiarCampo}
                />
            ),
        },
    ];

    return (
        <Collapse
            accordion
            ghost
            items={items}
            activeKey={abierto ? [abierto] : []}
            onChange={(claves) => onAbrir(claves.length > 0 ? claves[claves.length - 1] : null)}
        />
    );
}
