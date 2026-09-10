import { useId } from 'react';
import { FONDOS_PALETA, tramosDeForma } from '@features/mapalab-eventos/constants/diversion';

const FONDO_BASE = { forma: 'solido', colores: ['blanco'] };
const BORDE_BASE = { forma: 'ninguno', colores: [] };

const colorDeFondo = (id) => FONDOS_PALETA.find((p) => p.value === id)?.color || '#FFFFFF';

const Franjas = ({ id, colores }) => (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
        {colores.flatMap((color, i) => [
            <stop key={`${i}-desde`} offset={`${(i / colores.length) * 100}%`} stopColor={color} />,
            <stop key={`${i}-hasta`} offset={`${((i + 1) / colores.length) * 100}%`} stopColor={color} />,
        ])}
    </linearGradient>
);

const Simbolo = ({ symbol, grande }) => {
    if ((symbol?.kind === 'image' || symbol?.kind === 'svg') && symbol.imageUrl) {
        return <image href={symbol.imageUrl} x="10.5" y="10.5" width="19" height="19" />;
    }
    return (
        <text x="20" y="21.5" textAnchor="middle" dominantBaseline="central" fontSize={grande ? 22 : 17}>
            {symbol?.value || '⚽'}
        </text>
    );
};

export default function BotonEventoGlyph({ botonEstilo, symbol, size = 20 }) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const fondo = botonEstilo?.fondo || FONDO_BASE;
    const borde = botonEstilo?.borde || BORDE_BASE;
    const nFondo = tramosDeForma(fondo.forma);
    const nBorde = tramosDeForma(borde.forma);
    const coloresFondo = fondo.colores.slice(0, nFondo).map(colorDeFondo);
    const coloresBorde = borde.colores.slice(0, nBorde);
    const anillo = nBorde > 0;
    const grosor = 3.2;
    const radio = anillo ? 20 - grosor / 2 - 0.4 : 19.2;
    const relleno = nFondo === 0 ? 'none' : nFondo === 1 ? coloresFondo[0] : `url(#fondo${uid})`;

    return (
        <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            {(nFondo > 1 || anillo) && (
                <defs>
                    {nFondo > 1 && <Franjas id={`fondo${uid}`} colores={coloresFondo} />}
                    {anillo && <Franjas id={`borde${uid}`} colores={coloresBorde} />}
                </defs>
            )}
            <circle
                cx="20"
                cy="20"
                r={radio}
                fill={relleno}
                stroke={anillo ? `url(#borde${uid})` : 'none'}
                strokeWidth={anillo ? grosor : 0}
            />
            {anillo && <circle cx="20" cy="20" r="19.65" fill="none" stroke="rgba(0,0,0,.16)" strokeWidth=".5" />}
            <Simbolo symbol={symbol} grande={!anillo && nFondo === 0} />
        </svg>
    );
}
