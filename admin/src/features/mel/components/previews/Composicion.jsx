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

export default function Composicion({ paleta, tipos, campos, aplicacion, activo, demo, onElemento }) {
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

    const familiaTitulo = tipos.display || 'inherit';
    const familiaCuerpo = tipos.sans || 'inherit';
    const logoUrl = (campos || {})['logo.largo.claro'] || '';

    const zona = (id, estilo) => ({
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
    });

    const estiloTag = (frente, fondoTag) => ({
        fontSize: 12,
        padding: '2px 9px',
        borderRadius: Math.min(radio, 12),
        background: fondoTag,
        color: frente,
        whiteSpace: 'nowrap',
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
                fontFamily: familiaCuerpo,
            }}
        >
            <div {...zona('logo', { marginBottom: 18, display: 'flex', alignItems: 'center' })}>
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt='Logotipo de la marca'
                        style={{ height: 40, maxWidth: 260, objectFit: 'contain' }}
                    />
                ) : (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 40,
                            padding: '0 16px',
                            border: '1px dashed #d9d9d9',
                            borderRadius: 8,
                            fontSize: 12.5,
                            color: 'rgba(0,0,0,0.45)',
                        }}
                    >
                        logo.largo.claro sin definir
                    </span>
                )}
            </div>

            <div {...zona('titulo', { fontFamily: familiaTitulo, fontSize: tipos['2xl'] || 32, fontWeight: 600, lineHeight: 1.2, color: primary })}>
                Jalisco en cifras
            </div>

            <div {...zona('subrayado', { height: 3, width: 72, background: accent, borderRadius: 2, margin: '10px 0 14px 0' })} />

            <div {...zona('bajada', { fontSize: tipos.base || 16, color: texto, maxWidth: 560, lineHeight: 1.6 })}>
                Panorama estadístico del estado, actualizado al tercer trimestre. Los datos vienen del
                registro administrativo y se publican con corte mensual.
            </div>

            <div {...zona('filaBotones', { display: 'flex', gap: separacion, marginTop: 20, alignItems: 'center', flexWrap: 'wrap' })}>
                <div {...zona('botonPrimario', { display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 18px', borderRadius: radio, background: primary, color: '#fff', fontSize: tipos.base || 15 })}>
                    Ver indicadores
                </div>
                <div {...zona('botonAcento', { display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 18px', borderRadius: radio, border: `1px solid ${accent}`, color: accent, fontSize: tipos.base || 15 })}>
                    Descargar datos
                </div>
                <div {...zona('enlace', { fontSize: tipos.sm || 14, color: secondary, textDecoration: 'underline' })}>
                    Metodología
                </div>
            </div>

            <div {...zona('tags', { display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' })}>
                <div {...zona('tagAprobada', estiloTag(c('color.success', RESPALDOS.success), c('color.success-soft', RESPALDOS.successSoft)))}>
                    Aprobada
                </div>
                <div {...zona('tagPendiente', estiloTag(c('color.warning', RESPALDOS.warning), c('color.warning-soft', RESPALDOS.warningSoft)))}>
                    Pendiente
                </div>
                <div {...zona('tagRechazada', estiloTag(c('color.danger', RESPALDOS.danger), c('color.danger-soft', RESPALDOS.dangerSoft)))}>
                    Rechazada
                </div>
                <div {...zona('tagRevision', estiloTag(c('color.info', RESPALDOS.info), c('color.info-soft', RESPALDOS.infoSoft)))}>
                    En revisión
                </div>
            </div>

            <div {...zona('tarjetas', { display: 'flex', gap: 14, marginTop: 24, flexWrap: 'wrap' })}>
                <div {...zona('campo', { flexGrow: 1, minWidth: 180, border: '1px solid #f0f0f0', borderRadius: radio, padding: 16, background: superficie })}>
                    <div {...zona('cifra', { fontSize: tipos.lg || 22, fontWeight: 600, color: texto })}>
                        8 348 151
                    </div>
                    <div {...zona('barraCifra', { height: 4, width: '62%', background: primary, borderRadius: 2, margin: '8px 0' })} />
                    <div {...zona('nota', { fontSize: tipos.xs || 12, color: texto, opacity: 0.7 })}>
                        habitantes · censo 2020
                    </div>
                </div>
                <div {...zona('tarjetaSombra', { flexGrow: 1, minWidth: 180, border: '1px solid #f0f0f0', borderRadius: radio, padding: 16, background: superficie, boxShadow: sombraDemo || 'none' })}>
                    <div style={{ fontSize: tipos.lg || 22, fontWeight: 600, color: texto }}>125</div>
                    <div style={{ fontSize: tipos.xs || 12, color: texto, opacity: 0.7, marginTop: 8 }}>
                        municipios
                    </div>
                </div>
            </div>

            <div {...zona('grafica', { marginTop: 26 })}>
                <div {...zona('subtitulo', { fontSize: tipos.lg || 18, fontWeight: 600, color: secondary, marginBottom: 12 })}>
                    Delitos por municipio
                </div>
                <div {...zona('barras', { display: 'flex', alignItems: 'flex-end', gap: 10, height: 110 })}>
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
                </div>
            </div>

            <div {...zona('tabla', { marginTop: 26 })}>
                <div {...zona('encabezadoTabla', { display: 'flex', padding: '8px 0', borderBottom: `2px solid ${secondary}`, fontSize: tipos.sm || 13, fontWeight: 600, color: secondary })}>
                    <span style={{ flexGrow: 1 }}>Municipio</span>
                    <span style={{ width: 120, textAlign: 'right' }}>Población</span>
                    <span style={{ width: 80, textAlign: 'right' }}>Variación</span>
                </div>
                <div {...zona('filasTabla', {})}>
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
                </div>
            </div>

            <div {...zona('aviso', { marginTop: 22, padding: '10px 14px', borderRadius: radio, background: c('color.accent-soft', '#FFF7E6'), fontSize: tipos.sm || 13, color: texto })}>
                Las cifras del trimestre en curso son preliminares.
            </div>
        </div>
    );
}
