import { Tooltip } from 'antd';
import { SEMANTIC } from '@app/providers/brand';

const ESTILO_TRAMO = {
    ok: { fondo: SEMANTIC.successSoft, trama: null, texto: 'operativo' },
    degraded: {
        fondo: SEMANTIC.warningSoft,
        trama: `repeating-linear-gradient(45deg, ${SEMANTIC.warning} 0 2px, transparent 2px 6px)`,
        texto: 'degradado',
    },
    down: {
        fondo: SEMANTIC.dangerSoft,
        trama: `repeating-linear-gradient(45deg, ${SEMANTIC.danger} 0 2px, transparent 2px 5px)`,
        texto: 'caído',
    },
    unreachable: {
        fondo: SEMANTIC.dangerSoft,
        trama: `repeating-linear-gradient(45deg, ${SEMANTIC.danger} 0 2px, transparent 2px 5px)`,
        texto: 'no responde',
    },
    sin_datos: {
        fondo: SEMANTIC.neutralSoft,
        trama: `repeating-linear-gradient(90deg, ${SEMANTIC.neutral} 0 1px, transparent 1px 6px),`
            + ` repeating-linear-gradient(0deg, ${SEMANTIC.neutral} 0 1px, transparent 1px 6px)`,
        texto: 'sin datos',
    },
};

const estiloDe = (estado) => ESTILO_TRAMO[estado] || ESTILO_TRAMO.sin_datos;

const enMinutos = (celdas, resolucionSeg) => Math.round(celdas * resolucionSeg / 60);

const duracionLegible = (minutos) => {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return resto ? `${horas} h ${resto} min` : `${horas} h`;
};

const hora = (desde, celda, resolucionSeg) => {
    const momento = new Date(new Date(desde).getTime() + celda * resolucionSeg * 1000);
    return momento.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const tituloTramo = (tramo, tramos) => {
    const { desde, resolucion_seg: resolucion } = tramos;
    const estilo = estiloDe(tramo.estado);
    const minutos = enMinutos(tramo.dur, resolucion);
    const inicio = hora(desde, tramo.min, resolucion);
    const fin = hora(desde, tramo.min + tramo.dur, resolucion);
    const encabezado = `${estilo.texto} · ${duracionLegible(minutos)}`;
    return (
        <span>
            <strong>{encabezado}</strong>
            <br />
            {`${inicio} → ${fin}`}
            {tramo.detalle && <><br />{tramo.detalle}</>}
        </span>
    );
};

export default function BarraDisponibilidad({ tramos, alto = 14 }) {
    const contenedor = {
        display: 'flex',
        height: alto,
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid #f0f0f0',
        background: SEMANTIC.neutralSoft,
    };

    if (!tramos?.tramos?.length) {
        return <div style={contenedor} aria-label="Sin historial de disponibilidad" />;
    }

    return (
        <div style={contenedor} role="img" aria-label="Disponibilidad de las últimas 24 horas">
            {tramos.tramos.map((tramo) => {
                const estilo = estiloDe(tramo.estado);
                return (
                    <Tooltip key={tramo.min} title={tituloTramo(tramo, tramos)} trigger={['hover', 'click']}>
                        <div style={{
                            width: `${tramo.dur / tramos.celdas * 100}%`,
                            minWidth: 2,
                            backgroundColor: estilo.fondo,
                            backgroundImage: estilo.trama || 'none',
                        }} />
                    </Tooltip>
                );
            })}
        </div>
    );
}
