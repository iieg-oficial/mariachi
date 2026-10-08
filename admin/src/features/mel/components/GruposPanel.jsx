import { Collapse, Input, Popover, Tag, Tooltip, Typography } from 'antd';
import CamposPanel from '@features/mel/components/CamposPanel';
import { esHex } from '@features/mel/helpers/contraste';
import { tocaElemento } from '@features/mel/helpers/aplicacion';
import EditorToken from '@features/mel/components/EditorToken';

const { Text } = Typography;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const DATAVIZ_EJEMPLO = [
    { clave: 'dataviz.seq.1', valor: '#F2E6F5' },
    { clave: 'dataviz.seq.3', valor: '#B98FC7' },
    { clave: 'dataviz.seq.5', valor: '#5C2472' },
    { clave: 'dataviz.cat.1', valor: '#5C2472' },
    { clave: 'dataviz.cat.2', valor: '#1F7A4D' },
    { clave: 'dataviz.cat.3', valor: '#B3261E' },
];

const BREAKPOINT_EJEMPLO = [
    { clave: 'breakpoint.sm', valor: '640px' },
    { clave: 'breakpoint.md', valor: '768px' },
    { clave: 'breakpoint.lg', valor: '1024px' },
    { clave: 'breakpoint.xl', valor: '1280px' },
];

const aPx = (valor) => {
    const texto = String(valor ?? '').trim();
    if (texto.endsWith('rem')) return Math.round(parseFloat(texto) * 16);
    if (texto.endsWith('px')) return Math.round(parseFloat(texto));
    return null;
};

const Clave = ({ token, activo, relacionado, onSeleccionar }) => (
    <Tooltip title={token.descripcion} placement='topLeft' styles={{ root: { maxWidth: 420 } }}>
        <button
            type='button'
            onClick={() => onSeleccionar(token.id)}
            style={{
                fontFamily: MONO,
                fontSize: 12,
                width: 168,
                flexShrink: 0,
                background: 'none',
                border: 'none',
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
                color: activo || relacionado ? '#2e4372' : 'inherit',
                fontWeight: activo || relacionado ? 600 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}
        >
            {token.clave}
        </button>
    </Tooltip>
);

const Fila = ({ token, valor, onCambiar, seleccion, elemento, onSeleccionar, muestra, ancla, onCerrarAncla, fondo, colorTexto }) => {
    const activo = token.id === seleccion;
    const relacionado = tocaElemento(token.clave, valor, elemento);
    const cuerpo = (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '6px 8px',
                borderRadius: 8,
                borderBottom: '1px solid #f5f5f5',
                background: activo ? '#EAEFFA' : (relacionado ? '#F6F8FD' : 'transparent'),
                boxShadow: activo ? 'inset 0 0 0 1px #2e4372' : 'none',
            }}
        >
            <Clave token={token} activo={activo} relacionado={relacionado} onSeleccionar={onSeleccionar} />
            <Input
                size='small'
                value={valor}
                onChange={(evento) => onCambiar(token, evento.target.value)}
                style={{ width: 132, flexShrink: 0 }}
            />
            {muestra}
        </div>
    );

    if (ancla !== token.id) return cuerpo;

    return (
        <Popover
            open
            trigger='click'
            placement='rightTop'
            onOpenChange={(abierto) => { if (!abierto) onCerrarAncla(); }}
            content={(
                <EditorToken
                    token={token}
                    valor={valor}
                    onCambiar={onCambiar}
                    fondo={fondo}
                    colorTexto={colorTexto}
                    ancho={380}
                />
            )}
        >
            {cuerpo}
        </Popover>
    );
};

const Ejemplo = ({ filas, pintar }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Text type='secondary' style={{ fontSize: 12.5 }}>
            No hay ninguno definido. Así se vería un juego normal:
        </Text>
        {filas.map((fila) => (
            <div key={fila.clave} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, width: 168, flexShrink: 0, color: 'rgba(0,0,0,0.45)' }}>
                    {fila.clave}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12, width: 132, flexShrink: 0, color: 'rgba(0,0,0,0.45)' }}>
                    {fila.valor}
                </span>
                {pintar(fila)}
            </div>
        ))}
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
    elemento,
    ancla,
    onCerrarAncla,
    fondo,
    colorTexto,
}) {
    const de = (grupos) => tokens.filter((token) => grupos.includes(token.grupo));
    const tipografia = de(['tipografia']);
    const espaciado = de(['espaciado']);
    const forma = de(['radio', 'sombra']);
    const dataviz = de(['dataviz']);
    const breakpoints = de(['breakpoint']);

    const comunes = { seleccion, elemento, onSeleccionar, onCambiar: onCambiarToken, ancla, onCerrarAncla, fondo, colorTexto };

    const filas = (lista, muestraDe) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {lista.map((token) => {
                const valor = valorDeToken(token);
                return (
                    <Fila
                        key={token.id}
                        token={token}
                        valor={valor}
                        muestra={muestraDe ? muestraDe(token, valor) : null}
                        {...comunes}
                    />
                );
            })}
        </div>
    );

    const muestraTipo = (token, valor) => {
        const px = aPx(valor);
        if (!px) return <Text type='secondary' style={{ fontSize: 13, ...{ whiteSpace: 'nowrap' } }}>{valor}</Text>;
        return (
            <span style={{ fontSize: Math.min(px, 26), lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                Jalisco en cifras
            </span>
        );
    };

    const muestraColor = (token, valor) => (
        esHex(valor)
            ? <span style={{ height: 16, borderRadius: 4, flexGrow: 1, maxWidth: 160, background: valor, border: '1px solid rgba(0,0,0,0.08)' }} />
            : null
    );

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
            children: filas(tipografia, muestraTipo),
        },
        {
            key: 'espaciado',
            label: cabecera('Espaciado', espaciado.length, 'la escala de separación'),
            children: filas(espaciado),
        },
        {
            key: 'forma',
            label: cabecera('Forma', forma.length, 'radios y sombras'),
            children: filas(forma),
        },
        {
            key: 'dataviz',
            label: cabecera('Dataviz', dataviz.length, 'paletas de visualización'),
            children: dataviz.length > 0
                ? filas(dataviz, muestraColor)
                : (
                    <Ejemplo
                        filas={DATAVIZ_EJEMPLO}
                        pintar={(fila) => (
                            <span style={{ height: 16, borderRadius: 4, flexGrow: 1, maxWidth: 160, background: fila.valor, border: '1px solid rgba(0,0,0,0.08)' }} />
                        )}
                    />
                ),
        },
        {
            key: 'breakpoints',
            label: cabecera('Breakpoints', breakpoints.length, 'anchos donde cambia el diseño'),
            children: breakpoints.length > 0
                ? filas(breakpoints)
                : <Ejemplo filas={BREAKPOINT_EJEMPLO} pintar={() => null} />,
        },
        {
            key: 'guia',
            label: cabecera('Guía de marca', Object.keys(campos).length, sinDefinir > 0 ? `${sinDefinir} sin definir` : 'completa'),
            children: (
                <CamposPanel campos={campos} valorDeCampo={valorDeCampo} onCambiar={onCambiarCampo} />
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
