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

export default function Composicion({ paleta, tipos, aplicacion, activo, demo }) {
    const c = (nombre, respaldo) => (esHex(paleta[nombre]) ? paleta[nombre] : respaldo);
    const primary = c('color.primary', RESPALDOS.primary);
    const secondary = c('color.secondary', RESPALDOS.secondary);
    const accent = c('color.accent', RESPALDOS.accent);
    const texto = c('color.text', RESPALDOS.text);
    const fondo = c('color.bg', RESPALDOS.bg);
    const superficie = c('color.surface-field', RESPALDOS.surface);

    const apagar = (elemento) => estiloApagado(elemento, aplicacion, activo);

    const radio = demo && demo.tipo === 'radio' ? demo.valor : 8;
    const separacion = demo && demo.tipo === 'espacio' ? demo.valor : 12;
    const sombraDemo = demo && demo.tipo === 'sombra' ? demo.valor : null;
    const anchoDemo = demo && demo.tipo === 'ancho' ? demo.valor : null;

    const familiaTitulo = tipos.display || 'inherit';
    const familiaCuerpo = tipos.sans || 'inherit';

    const tag = (etiqueta, frente, fondoTag, elemento) => (
        <span
            style={{
                fontSize: 12,
                padding: '2px 9px',
                borderRadius: Math.min(radio, 12),
                background: fondoTag,
                color: frente,
                whiteSpace: 'nowrap',
                ...apagar(elemento),
            }}
        >
            {etiqueta}
        </span>
    );

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
            <div
                style={{
                    fontFamily: familiaTitulo,
                    fontSize: tipos['2xl'] || 32,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    color: primary,
                    ...apagar('titulo'),
                }}
            >
                Jalisco en cifras
            </div>

            <div
                style={{
                    height: 3,
                    width: 72,
                    background: accent,
                    borderRadius: 2,
                    margin: '10px 0 14px 0',
                    ...apagar('subrayado'),
                }}
            />

            <div
                style={{
                    fontSize: tipos.base || 16,
                    color: texto,
                    maxWidth: 560,
                    lineHeight: 1.6,
                    ...apagar('bajada'),
                }}
            >
                Panorama estadístico del estado, actualizado al tercer trimestre. Los datos vienen del
                registro administrativo y se publican con corte mensual.
            </div>

            <div style={{ display: 'flex', gap: separacion, marginTop: 20, alignItems: 'center', flexWrap: 'wrap', ...apagar('filaBotones') }}>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 36,
                        padding: '0 18px',
                        borderRadius: radio,
                        background: primary,
                        color: '#fff',
                        fontSize: tipos.base || 15,
                        ...apagar('botonPrimario'),
                    }}
                >
                    Ver indicadores
                </span>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 36,
                        padding: '0 18px',
                        borderRadius: radio,
                        border: `1px solid ${accent}`,
                        color: accent,
                        fontSize: tipos.base || 15,
                        ...apagar('botonAcento'),
                    }}
                >
                    Descargar datos
                </span>
                <span style={{ fontSize: tipos.sm || 14, color: secondary, textDecoration: 'underline', ...apagar('enlace') }}>
                    Metodología
                </span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', ...apagar('tags') }}>
                {tag('Aprobada', c('color.success', RESPALDOS.success), c('color.success-soft', RESPALDOS.successSoft), 'tagAprobada')}
                {tag('Pendiente', c('color.warning', RESPALDOS.warning), c('color.warning-soft', RESPALDOS.warningSoft), 'tagPendiente')}
                {tag('Rechazada', c('color.danger', RESPALDOS.danger), c('color.danger-soft', RESPALDOS.dangerSoft), 'tagRechazada')}
                {tag('En revisión', c('color.info', RESPALDOS.info), c('color.info-soft', RESPALDOS.infoSoft), 'tagRevision')}
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 24, flexWrap: 'wrap', ...apagar('tarjetas') }}>
                <div
                    style={{
                        flexGrow: 1,
                        minWidth: 180,
                        border: '1px solid #f0f0f0',
                        borderRadius: radio,
                        padding: 16,
                        background: superficie,
                        ...apagar('campo'),
                    }}
                >
                    <div style={{ fontSize: tipos.lg || 22, fontWeight: 600, color: texto, ...apagar('cifra') }}>
                        8 348 151
                    </div>
                    <div style={{ height: 4, width: '62%', background: primary, borderRadius: 2, margin: '8px 0', ...apagar('barraCifra') }} />
                    <div style={{ fontSize: tipos.xs || 12, color: texto, opacity: 0.7, ...apagar('nota') }}>
                        habitantes · censo 2020
                    </div>
                </div>
                <div
                    style={{
                        flexGrow: 1,
                        minWidth: 180,
                        border: '1px solid #f0f0f0',
                        borderRadius: radio,
                        padding: 16,
                        background: superficie,
                        boxShadow: sombraDemo || 'none',
                        ...apagar('tarjetaSombra'),
                    }}
                >
                    <div style={{ fontSize: tipos.lg || 22, fontWeight: 600, color: texto }}>125</div>
                    <div style={{ fontSize: tipos.xs || 12, color: texto, opacity: 0.7, marginTop: 8 }}>
                        municipios
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 26, ...apagar('grafica') }}>
                <div style={{ fontSize: tipos.lg || 18, fontWeight: 600, color: secondary, marginBottom: 12, ...apagar('subtitulo') }}>
                    Delitos por municipio
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110, ...apagar('barras') }}>
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

            <div style={{ marginTop: 26, ...apagar('tabla') }}>
                <div style={{ display: 'flex', padding: '8px 0', borderBottom: `2px solid ${secondary}`, fontSize: tipos.sm || 13, fontWeight: 600, color: secondary, ...apagar('encabezadoTabla') }}>
                    <span style={{ flexGrow: 1 }}>Municipio</span>
                    <span style={{ width: 120, textAlign: 'right' }}>Población</span>
                    <span style={{ width: 80, textAlign: 'right' }}>Variación</span>
                </div>
                <div style={apagar('filasTabla')}>
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

            <div
                style={{
                    marginTop: 22,
                    padding: '10px 14px',
                    borderRadius: radio,
                    background: c('color.accent-soft', '#FFF7E6'),
                    fontSize: tipos.sm || 13,
                    color: texto,
                    ...apagar('aviso'),
                }}
            >
                Las cifras del trimestre en curso son preliminares.
            </div>
        </div>
    );
}
