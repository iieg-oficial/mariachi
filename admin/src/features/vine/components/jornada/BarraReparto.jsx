import { Tooltip } from 'antd';

import { SEGMENTOS_JORNADA, formatoMinutos } from '@features/vine/constants/jornada';
import { ORDEN_REPARTO, TARDE, fondo } from '@features/vine/components/jornada/piezas';


const BarraReparto = ({ reparto, escala, alto = 12, sufijo = '' }) => {
    if (!reparto) return null;
    const pct = (m) => `${(m / Math.max(1, escala)) * 100}%`;
    const segmentos = ORDEN_REPARTO
        .map((clave) => SEGMENTOS_JORNADA.find((s) => s.clave === clave))
        .filter((s) => reparto[s.clave] > 0);
    const detalle = [
        reparto.tarde > 0 && `No llegó a su hora: ${formatoMinutos(reparto.tarde)}${sufijo}`,
        ...segmentos.map((s) => `${s.nombre}: ${formatoMinutos(reparto[s.clave])}${sufijo}`),
        reparto.jornadas && `${reparto.jornadas} jornadas cerradas`,
    ].filter(Boolean).map((l) => <div key={l}>{l}</div>);

    return (
        <Tooltip title={detalle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: alto, width: '100%', cursor: 'default' }}>
                {reparto.tarde > 0 && (
                    <div style={{ width: pct(reparto.tarde), height: '100%', borderRadius: 2, marginRight: 3, ...TARDE }} />
                )}
                {segmentos.map((s) => (
                    <div key={s.clave} style={{ width: pct(reparto[s.clave]), height: '100%', borderRadius: 2, ...fondo(s) }} />
                ))}
            </div>
        </Tooltip>
    );
};

export default BarraReparto;
