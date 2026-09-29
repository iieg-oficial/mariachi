import { Tooltip } from 'antd';

import { COLOR_REFERENCIA, COLOR_TINTA } from '@features/vine/constants/jornada';
import { detalle, estiloTramo, radiosDe } from '@features/vine/components/jornada/piezas';

const MINIMO_VISIBLE = 30;

const ColumnaReloj = ({
    d, rango, alto, horaEntrada, ancho, radio = 2, onElegir, elegido = false,
}) => {
    const [ini, fin] = rango;
    const escala = alto / Math.max(1, fin - ini);
    const propios = (d.tramos ?? []).filter(([tipo]) => tipo !== 'tarde');
    const tramos = d.visita && propios.length
        ? [['visita', propios[0][1], propios[propios.length - 1][2]]]
        : (d.tramos ?? []).filter(([tipo, desde, hasta]) => hasta > ini && desde < fin
            && !(tipo === 'minimo' && hasta - desde < MINIMO_VISIBLE));
    return (
        <Tooltip title={detalle(d, horaEntrada)}>
            <div
                role={onElegir ? 'button' : undefined}
                tabIndex={onElegir ? 0 : undefined}
                onClick={onElegir ? (e) => { e.stopPropagation(); onElegir(d.dia); } : undefined}
                onKeyDown={onElegir ? (e) => { if (e.key === 'Enter') onElegir(d.dia); } : undefined}
                style={{
                    position: 'relative',
                    height: alto,
                    flex: ancho ? `0 0 ${ancho}px` : '1 1 0',
                    minWidth: ancho ?? 8,
                    cursor: onElegir ? 'pointer' : 'default',
                    borderRadius: radio + 1,
                    outline: elegido ? `2px solid ${COLOR_TINTA}` : 'none',
                    outlineOffset: 2,
                    background: elegido ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                }}
            >
                {(d.estado === 'inhabil' || d.inhabil) && (
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: `1px dashed ${COLOR_REFERENCIA}`,
                    }}
                    />
                )}
                {tramos.map(([tipo, desde, hasta], i) => {
                    const { inicio, fin: final } = radiosDe(tramos, i, radio);
                    return (
                        <div
                            key={`${tipo}${desde}`}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: (Math.max(desde, ini) - ini) * escala,
                                height: Math.max(tipo === 'visita' ? 3 : 1, (Math.min(hasta, fin) - Math.max(desde, ini)) * escala),
                                borderRadius: `${inicio}px ${inicio}px ${final}px ${final}px`,
                                ...estiloTramo(tipo),
                            }}
                        />
                    );
                })}
            </div>
        </Tooltip>
    );
};

export default ColumnaReloj;
