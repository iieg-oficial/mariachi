import { Popover } from 'antd';
import { aclarar, esHex } from '@features/mel/helpers/contraste';
import { estiloApagado } from '@features/mel/helpers/aplicacion';

const RESPALDOS = {
    primary: '#5C2472',
    secondary: '#2e4372',
    accent: '#FF8300',
    text: '#465055',
    bg: '#FFFFFF',
    surface: '#FAFAFA',
    success: '#1F7A4D',
    successSoft: '#E3F1E9',
    warning: '#9E5200',
    warningSoft: '#FFE9CC',
    danger: '#B3261E',
    dangerSoft: '#FBE4E2',
    info: '#2e4372',
    infoSoft: '#EAEFFA',
};

const MUNICIPIOS = [
    { nombre: 'Guadalajara', poblacion: '1 385 629', var: '0.4 %' },
    { nombre: 'Zapopan', poblacion: '1 476 491', var: '2.1 %' },
    { nombre: 'Tlaquepaque', poblacion: '687 127', var: '1.3 %' },
];

const ALTURAS = [78, 52, 66, 38, 92, 30];
const SIGLAS = ['GDL', 'ZAP', 'TLQ', 'TON', 'ZPT', 'TLJ'];

export function Zona({ id, estilo, ctx, children }) {
    const { aplicacion, activo, onElemento, anclado, editor, onCerrar } = ctx;
    const props = {
        role: 'button',
        tabIndex: 0,
        onMouseEnter: () => onElemento(id, false),
        onMouseLeave: () => onElemento(null, false),
        onClick: (evento) => { evento.stopPropagation(); onElemento(id, true); },
        onKeyDown: (evento) => {
            if (evento.key !== 'Enter' && evento.key !== ' ') return;
            evento.preventDefault();
            evento.stopPropagation();
            onElemento(id, true);
        },
        style: { cursor: 'pointer', ...estilo, ...estiloApagado(id, aplicacion, activo) },
    };

    if (anclado !== id) return <div {...props}>{children}</div>;

    return (
        <Popover
            open
            trigger='click'
            placement='rightTop'
            content={editor}
            onOpenChange={(abierto) => { if (!abierto) onCerrar(); }}
        >
            <div {...props}>{children}</div>
        </Popover>
    );
}

export default function Composicion({ paleta, tipos, campos, aplicacion, activo, demo, onElemento, anclado, editor, onCerrar }) {
    const c = (nombre, respaldo) => (esHex(paleta[nombre]) ? paleta[nombre] : respaldo);
    const primary = c('color.primary', RESPALDOS.primary);
    const secondary = c('color.secondary', RESPALDOS.secondary);
    const accent = c('color.accent', RESPALDOS.accent);
    const texto = c('color.text', RESPALDOS.text);
    const fondo = c('color.bg', RESPALDOS.bg);
    const superficie = c('color.surface-field', RESPALDOS.surface);

    const radio = demo && demo.tipo === 'radio' ? demo.valor : 8;
    const separacion = demo && demo.tipo === 'espacio' ? demo.valor : 12;
    const sombraDemo = demo && demo.tipo === 'sombra' ? demo.valor : null;
    const anchoDemo = demo && demo.tipo === 'ancho' ? demo.valor : null;

    const cuerpo = tipos.sans || 'inherit';
    const titular = tipos.display || cuerpo;
    const ctx = { aplicacion, activo, onElemento, anclado, editor, onCerrar };

    const logoClaro = (campos || {})['logo.largo.claro'] || '';
    const logoOscuro = (campos || {})['logo.largo.oscuro'] || '';

    const estiloTag = (frente, fondoTag) => ({
        fontSize: tipos.xs || 12,
        padding: '2px 9px',
        borderRadius: Math.min(radio, 12),
        background: fondoTag,
        color: frente,
        whiteSpace: 'nowrap',
    });

    const marcoLogo = (oscuro) => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        minWidth: 150,
        padding: '0 18px',
        borderRadius: 8,
        border: `1px solid ${oscuro ? '#2b2b2b' : '#e8e8e8'}`,
        background: oscuro ? '#2b2b2b' : '#ffffff',
    });

    return (
        <div
            style={{
                background: fondo,
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: 32,
                maxWidth: anchoDemo || '100%',
                marginLeft: anchoDemo ? 'auto' : 0,
                marginRight: anchoDemo ? 'auto' : 0,
                transition: 'max-width 0.3s ease',
                fontFamily: cuerpo,
            }}
        >
            <Zona id='logo' ctx={ctx} estilo={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={marcoLogo(false)}>
                    {logoClaro
                        ? <img src={logoClaro} alt='Logotipo sobre fondo claro' style={{ height: 34, maxWidth: 200, objectFit: 'contain' }} />
                        : <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>logo.largo.claro sin definir</span>}
                </span>
                <span style={marcoLogo(true)}>
                    {logoOscuro
                        ? <img src={logoOscuro} alt='Logotipo sobre fondo oscuro' style={{ height: 34, maxWidth: 200, objectFit: 'contain' }} />
                        : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>logo.largo.oscuro sin definir</span>}
                </span>
            </Zona>

            <Zona id='titulo' ctx={ctx} estilo={{ fontFamily: titular, fontSize: tipos['3xl'] || tipos['2xl'] || 30, fontWeight: tipos.bold || 600, lineHeight: tipos.tight || 1.2, color: primary }}>
                Jalisco en cifras
            </Zona>

            <Zona id='subrayado' ctx={ctx} estilo={{ height: 3, width: 72, background: accent, borderRadius: 2, margin: '10px 0 14px 0' }} />

            <Zona id='bajada' ctx={ctx} estilo={{ fontSize: tipos.base || 16, color: texto, maxWidth: 560, lineHeight: tipos.relaxed || 1.6 }}>
                Panorama estadístico del estado, actualizado al tercer trimestre. Los datos vienen del
                registro administrativo y se publican con corte mensual.
            </Zona>

            <Zona id='filaBotones' ctx={ctx} estilo={{ display: 'flex', gap: separacion, marginTop: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <Zona id='botonPrimario' ctx={ctx} estilo={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 18px', borderRadius: radio, background: primary, color: '#fff', fontSize: tipos.base || 15 }}>
                    Ver indicadores
                </Zona>
                <Zona id='botonAcento' ctx={ctx} estilo={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 18px', borderRadius: radio, border: `1px solid ${accent}`, color: accent, fontSize: tipos.base || 15 }}>
                    Descargar datos
                </Zona>
                <Zona id='enlace' ctx={ctx} estilo={{ fontSize: tipos.sm || 14, color: secondary, textDecoration: 'underline' }}>
                    Metodología
                </Zona>
            </Zona>

            <Zona id='tags' ctx={ctx} estilo={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                <Zona id='tagAprobada' ctx={ctx} estilo={estiloTag(c('color.success', RESPALDOS.success), c('color.success-soft', RESPALDOS.successSoft))}>
                    Aprobada
                </Zona>
                <Zona id='tagPendiente' ctx={ctx} estilo={estiloTag(c('color.warning', RESPALDOS.warning), c('color.warning-soft', RESPALDOS.warningSoft))}>
                    Pendiente
                </Zona>
                <Zona id='tagRechazada' ctx={ctx} estilo={estiloTag(c('color.danger', RESPALDOS.danger), c('color.danger-soft', RESPALDOS.dangerSoft))}>
                    Rechazada
                </Zona>
                <Zona id='tagRevision' ctx={ctx} estilo={estiloTag(c('color.info', RESPALDOS.info), c('color.info-soft', RESPALDOS.infoSoft))}>
                    En revisión
                </Zona>
            </Zona>

            <Zona id='tarjetas' ctx={ctx} estilo={{ display: 'flex', gap: 14, marginTop: 24, flexWrap: 'wrap' }}>
                <Zona id='campo' ctx={ctx} estilo={{ flexGrow: 1, minWidth: 180, border: '1px solid #f0f0f0', borderRadius: radio, padding: 16, background: superficie }}>
                    <Zona id='cifra' ctx={ctx} estilo={{ fontSize: tipos['2xl'] || 24, fontWeight: tipos.semibold || 600, color: texto, lineHeight: tipos.tight || 1.25 }}>
                        8 348 151
                    </Zona>
                    <Zona id='barraCifra' ctx={ctx} estilo={{ height: 4, width: '62%', background: primary, borderRadius: 2, margin: '8px 0' }} />
                    <Zona id='nota' ctx={ctx} estilo={{ fontSize: tipos.xs || 12, color: texto, opacity: 0.7 }}>
                        habitantes · censo 2020
                    </Zona>
                </Zona>
                <Zona id='tarjetaSombra' ctx={ctx} estilo={{ flexGrow: 1, minWidth: 180, border: '1px solid #f0f0f0', borderRadius: radio, padding: 16, background: superficie, boxShadow: sombraDemo || 'none' }}>
                    <div style={{ fontSize: tipos['2xl'] || 24, fontWeight: tipos.semibold || 600, color: texto }}>125</div>
                    <div style={{ fontSize: tipos.xs || 12, color: texto, opacity: 0.7, marginTop: 8 }}>
                        municipios
                    </div>
                </Zona>
            </Zona>

            <Zona id='grafica' ctx={ctx} estilo={{ marginTop: 26 }}>
                <Zona id='subtitulo' ctx={ctx} estilo={{ fontSize: tipos.xl || 20, fontWeight: tipos.semibold || 600, color: secondary, marginBottom: 12 }}>
                    Delitos por municipio
                </Zona>
                <Zona id='barras' ctx={ctx} estilo={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110 }}>
                    {ALTURAS.map((alto, indice) => (
                        <div key={SIGLAS[indice]} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div
                                style={{
                                    width: '100%',
                                    height: alto,
                                    borderRadius: `${Math.min(radio, 6)}px ${Math.min(radio, 6)}px 0 0`,
                                    background: aclarar(primary, (5 - indice) * 0.15),
                                }}
                            />
                            <span style={{ fontSize: tipos.xs || 11, color: texto, opacity: 0.6 }}>{SIGLAS[indice]}</span>
                        </div>
                    ))}
                </Zona>
            </Zona>

            <Zona id='tabla' ctx={ctx} estilo={{ marginTop: 26 }}>
                <Zona id='encabezadoTabla' ctx={ctx} estilo={{ display: 'flex', padding: '8px 0', borderBottom: `2px solid ${secondary}`, fontSize: tipos.sm || 13, fontWeight: tipos.semibold || 600, color: secondary }}>
                    <span style={{ flexGrow: 1 }}>Municipio</span>
                    <span style={{ width: 120, textAlign: 'right' }}>Población</span>
                    <span style={{ width: 80, textAlign: 'right' }}>Variación</span>
                </Zona>
                <Zona id='filasTabla' ctx={ctx} estilo={{}}>
                    {MUNICIPIOS.map((fila) => (
                        <div
                            key={fila.nombre}
                            style={{
                                display: 'flex',
                                padding: '9px 0',
                                borderBottom: '1px solid #f0f0f0',
                                fontSize: tipos.sm || 13,
                                color: texto,
                            }}
                        >
                            <span style={{ flexGrow: 1 }}>{fila.nombre}</span>
                            <span style={{ width: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fila.poblacion}</span>
                            <span style={{ width: 80, textAlign: 'right', color: c('color.success', RESPALDOS.success) }}>{fila.var}</span>
                        </div>
                    ))}
                </Zona>
            </Zona>

            <Zona id='aviso' ctx={ctx} estilo={{ marginTop: 22, padding: '10px 14px', borderRadius: radio, background: c('color.accent-soft', '#FFF7E6'), fontSize: tipos.sm || 13, color: texto }}>
                Las cifras del trimestre en curso son preliminares.
            </Zona>
        </div>
    );
}
